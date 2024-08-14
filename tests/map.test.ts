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
    const step2 = await MapProgram.rawMethods.insert(
      step1,
      map,
      Field(3),
      Field(4)
    );
    expect(step2.toBigInt()).toBe(map.root.toBigInt());
  });
  it(`should build the Indexed Merkle Map with proofs and root recalculation`, async () => {
    const map = new MerkleMap();
    const root = map.root;
    console.log("Compiling program...");
    console.time("compiled");
    await MapProgram.compile({ cache: Cache.FileSystem("./cache") });
    console.timeEnd("compiled");
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
    console.log("Step1 root:", step1.publicOutput.toJSON());
    console.log("Map root:", map.root.toJSON());
    map.insert(Field(1), Field(2));
    expect(step1.publicOutput.toBigInt()).toBe(map.root.toBigInt());
    const step2 = await MapProgram.insert(
      step1.publicOutput,
      map,
      Field(3),
      Field(4)
    );
    //map.insert(Field(3), Field(4));
    expect(step2.publicOutput.toBigInt()).toBe(map.root.toBigInt());
  });
});
