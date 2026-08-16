/** Đếm pass/fail và in kết quả, gom theo module. */

export function createReporter() {
  const results = [];
  let currentModule = "?";

  return {
    startModule(name) {
      currentModule = name;
      console.log(`\n== ${name} ==`);
    },

    /**
     * @param {string} id      Mã test case, khớp với bảng test case trong plan
     * @param {boolean} ok     Điều kiện cần đúng
     * @param {string} detail  Thông tin hiện khi fail — luôn kèm dữ liệu thực tế
     */
    check(id, ok, detail = "") {
      results.push({ module: currentModule, id, ok, detail });
      if (!ok) console.log(`  FAIL ${id} ${detail}`);
    },

    summary() {
      const passed = results.filter((r) => r.ok).length;
      const failed = results.filter((r) => !r.ok);

      console.log("\n----- KẾT QUẢ THEO MODULE -----");
      const modules = [...new Set(results.map((r) => r.module))];
      for (const name of modules) {
        const rows = results.filter((r) => r.module === name);
        const bad = rows.filter((r) => !r.ok).length;
        const mark = bad === 0 ? "OK  " : "FAIL";
        console.log(
          `  ${mark} ${name.padEnd(12)} ${rows.length - bad}/${rows.length}`,
        );
      }

      console.log(`\n===== ${passed} PASS / ${failed.length} FAIL =====`);

      if (failed.length > 0) {
        console.log("\nCác case chưa đạt:");
        for (const r of failed) console.log(`  - [${r.module}] ${r.id}: ${r.detail}`);
      }

      return failed.length === 0;
    },
  };
}
