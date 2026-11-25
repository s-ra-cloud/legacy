import { ktSources, type KTReferenceCoverage } from "@repo/shared/kt-import";

export function ktReferenceCoverage(rows:{name:string;status:string}[],kind:"authorPub"|"peopleGrant"):KTReferenceCoverage {
  const expected=ktSources.filter(s=>s.kind===kind);
  const records=expected.map(s=>rows.find(r=>r.name===s.name));
  const completed=records.filter(r=>r?.status==="complete").length;
  const status=records.some(r=>r?.status==="failed")?"failed"
    :completed===expected.length?"complete":records.every(r=>!r || r.status==="pending")?"not_imported":"partial";
  return {status,completed,expected:expected.length};
}
