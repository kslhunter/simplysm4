import { MathUtil } from "@simplysm/sd-core-common";
import { expect } from "chai";

describe("(common) core.utils.MathUtil", () => {
  it("min/max 사이의 랜덤한 정수값을 가져올 수 있다.", () => {
    expect(MathUtil.getRandomInt(101, 199))
      .to.least(100)
      .and.to.most(200);
  });
});