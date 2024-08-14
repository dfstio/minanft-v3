import { describe, expect, it } from "@jest/globals";
import { Experimental, Field, ZkProgram, Cache } from "o1js";

const { IndexedMerkleMap } = Experimental;
const height = 3;
class MerkleMap extends IndexedMerkleMap(height) {}

const MapProgram = ZkProgram({
  name: "MapProgram",
  publicInput: Field,
  publicOutput: Field,
  methods: {
    insert: {
      privateInputs: [MerkleMap, Field, Field],

      async method(oldRoot: Field, map: MerkleMap, key: Field, value: Field) {
        map.root.assertEquals(oldRoot);
        map.insert(key, value);
        return map.root;
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
    expect(step1.toBigInt()).toBe(map.root.toBigInt());
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
    console.log("map after:", {
      root: map.root.toJSON(),
      length: map.length.toJSON(),
      nodes: map.data.get().nodes,
      sortedLeaves: map.data.get().sortedLeaves,
    });
    expect(step1.publicOutput.toBigInt()).toBe(map.root.toBigInt());
  });
});
