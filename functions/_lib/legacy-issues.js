// The first ten issues of Still Building with Ami, migrated from Kit (Nov 2026).
// Source files live in content/newsletter/. These are published and read-only.
import i01 from "../../content/newsletter/issue-01.json";
import i02 from "../../content/newsletter/issue-02.json";
import i03 from "../../content/newsletter/issue-03.json";
import i04 from "../../content/newsletter/issue-04.json";
import i05 from "../../content/newsletter/issue-05.json";
import i06 from "../../content/newsletter/issue-06.json";
import i07 from "../../content/newsletter/issue-07.json";
import i08 from "../../content/newsletter/issue-08.json";
import i09 from "../../content/newsletter/issue-09.json";
import i10 from "../../content/newsletter/issue-10.json";

export const LEGACY_ISSUES = [i01, i02, i03, i04, i05, i06, i07, i08, i09, i10];
export const LEGACY_BY_NUMBER = Object.fromEntries(LEGACY_ISSUES.map((i) => [i.number, i]));
