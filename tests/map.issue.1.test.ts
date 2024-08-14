import { describe, expect, it } from "@jest/globals";
import { Experimental, Field, ZkProgram, Cache, Struct } from "o1js";

const { IndexedMerkleMap } = Experimental;
const height = 3;
class MerkleMap extends IndexedMerkleMap(height) {}
class MapState extends Struct({
  // this should just be a MerkleTree type that carries the full tree as aux data
  root: Field,
  length: Field,
}) {}

const MapProgram = ZkProgram({
  name: "MapProgram",
  publicInput: Field,
  publicOutput: MapState,
  methods: {
    insert: {
      privateInputs: [MerkleMap, Field, Field],

      async method(oldRoot: Field, map: MerkleMap, key: Field, value: Field) {
        map.root.assertEquals(oldRoot);
        map.insert(key, value);
        return new MapState({
          root: map.root,
          length: map.length,
        });
      },
    },
  },
});

describe("Map", () => {
  it(`should build the Indexed Merkle Map without proofs`, async () => {
    const map = new MerkleMap();
    const root = map.root;
    const step1 = await MapProgram.rawMethods.insert(
      root,
      map,
      Field(1),
      Field(2)
    );
    expect(step1.root.toBigInt()).toBe(map.root.toBigInt());
  });
  it(`should build the Indexed Merkle Map with proofs`, async () => {
    const map = new MerkleMap();
    const root = map.root;
    await MapProgram.compile({ cache: Cache.FileSystem("./cache") });
    console.log("map before:", {
      root: map.root.toJSON(),
      length: map.length.toJSON(),
      nodes: map.data.get().nodes,
      sortedLeaves: map.data.get().sortedLeaves,
    });
    const step1 = await MapProgram.insert(root, map, Field(1), Field(2));
    map.root = step1.publicOutput.root;
    map.length = step1.publicOutput.length;
    console.log("map after:", {
      root: map.root.toJSON(),
      length: map.length.toJSON(),
      nodes: map.data.get().nodes,
      sortedLeaves: map.data.get().sortedLeaves,
    });
    expect(step1.publicOutput.root.toBigInt()).toBe(map.root.toBigInt());
  });
});
