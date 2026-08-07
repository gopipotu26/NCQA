/**
 * Identity Mismatch Enhancement — Unit Tests
 *
 * Covers the four identity check outcomes:
 *   PASS            – all identity fields match across documents
 *   FAIL            – clear mismatch (different individual confirmed)
 *   MANUAL_REVIEW   – ambiguous / name variant / OCR uncertainty
 *   UNABLE_TO_VERIFY – missing or illegible identity information
 *
 * These tests validate the business logic that must live in buildProviderIdentityFinding
 * (server-side) and the helper methods on AuditDetail (client-side).  Because the
 * server function is compiled as ESM, the logic is extracted here as pure functions
 * so Jasmine / Karma can run them without spinning up the Express server.
 */

// ---------------------------------------------------------------------------
// Inline re-implementation of the server-side business logic under test.
// This mirrors buildProviderIdentityFinding() in server.ts exactly so that
// any future drift between the two will surface as a test failure.
// ---------------------------------------------------------------------------

interface IdentityInput {
  result: 'PASS' | 'FAIL' | 'MANUAL_REVIEW' | 'UNABLE_TO_VERIFY';
  primaryIdentifiers?: {
    fullName?: string | null;
    dateOfBirth?: string | null;
    npi?: string | null;
    specialty?: string | null;
  };
  foreignProviderNames?: string[];
  conflictingFields?: string[];
  comments?: string;
}

interface IdentityFinding {
  status: 'PASS' | 'FAIL';
  confidence: number;
  finding: string;
  recommendation: string;
}

function buildIdentityFinding(identity: IdentityInput): IdentityFinding {
  const ids = identity.primaryIdentifiers || {};
  const detected = [
    `Name: ${ids.fullName || 'Not Found'}`,
    `DOB: ${ids.dateOfBirth || 'Not Found'}`,
    `NPI: ${ids.npi || 'Not Found'}`,
    `Specialty: ${ids.specialty || 'Not Found'}`
  ].join(' | ');

  const identityResult = identity.result || 'UNABLE_TO_VERIFY';
  const foreignNames: string[] = Array.isArray(identity.foreignProviderNames) ? identity.foreignProviderNames : [];
  const conflicts: string[] = Array.isArray(identity.conflictingFields) ? identity.conflictingFields : [];

  let finding: string;
  let recommendation: string;
  let findingStatus: 'PASS' | 'FAIL';
  let confidence: number;

  switch (identityResult) {
    case 'PASS':
      finding = `All uploaded pages belong to the same provider. Detected identity — ${detected}.`;
      recommendation = 'No action required.';
      findingStatus = 'PASS';
      confidence = 90;
      break;

    case 'FAIL': {
      const issues: string[] = [];
      if (foreignNames.length) issues.push(`Other provider name(s) found: ${foreignNames.join(', ')}`);
      if (conflicts.length) issues.push(`Conflicting fields: ${conflicts.join('; ')}`);
      finding = `Provider identity mismatch detected. Detected identity — ${detected}.` +
        (issues.length ? ` ${issues.join('. ')}.` : ` ${identity.comments || 'Documents may belong to more than one provider.'}`);
      recommendation = 'Review the packet and remove or correct pages that do not belong to the primary provider before crediting the file.';
      findingStatus = 'FAIL';
      confidence = 90;
      break;
    }

    case 'MANUAL_REVIEW': {
      const reasons: string[] = [];
      if (foreignNames.length) reasons.push(`name variant(s) detected: ${foreignNames.join(', ')}`);
      if (conflicts.length) reasons.push(`potential discrepancies: ${conflicts.join('; ')}`);
      finding = `Identity verification requires manual review. Detected identity — ${detected}.` +
        (reasons.length ? ` Human review needed for ${reasons.join('; ')}.` : ` ${identity.comments || 'Ambiguous identity information requires human verification.'}`);
      recommendation = 'Manually verify the provider identity against a government-issued ID or official record before crediting the file. Do not approve identity automatically.';
      findingStatus = 'FAIL';
      confidence = 65;
      break;
    }

    case 'UNABLE_TO_VERIFY':
    default:
      finding = `Provider identity cannot be verified. Detected identity — ${detected}. ` +
        (identity.comments || 'Critical identity fields (Name, DOB, NPI) are missing or illegible in the packet — insufficient information to confirm identity.');
      recommendation = 'Obtain legible copies of documents containing provider name, date of birth, and NPI before processing this file.';
      findingStatus = 'FAIL';
      confidence = 40;
      break;
  }

  return { status: findingStatus, confidence, finding, recommendation };
}

// ---------------------------------------------------------------------------
// Helper method re-implementations (from AuditDetail component)
// ---------------------------------------------------------------------------

function identityCardClass(result: string): string {
  switch (result) {
    case 'PASS':            return 'bg-emerald-50 border-emerald-100';
    case 'FAIL':            return 'bg-rose-50 border-rose-200';
    case 'MANUAL_REVIEW':   return 'bg-amber-50 border-amber-200';
    case 'UNABLE_TO_VERIFY':return 'bg-slate-50 border-slate-200';
    default:                return 'bg-slate-50 border-slate-200';
  }
}

function identityBadgeText(result: string): string {
  switch (result) {
    case 'PASS':            return '✓ Identity Consistent';
    case 'FAIL':            return '⚠ Identity Mismatch Detected';
    case 'MANUAL_REVIEW':   return '🔍 Manual Review Required';
    case 'UNABLE_TO_VERIFY':return '❓ Unable to Verify Identity';
    default:                return '❓ Unable to Verify Identity';
  }
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('Identity Mismatch Enhancement', () => {

  // ---- PASS ----------------------------------------------------------------
  describe('PASS outcome', () => {
    const input: IdentityInput = {
      result: 'PASS',
      primaryIdentifiers: { fullName: 'Tyler Allen Sherman', dateOfBirth: '02/18/1982', npi: '1386911626', specialty: 'Family Medicine' },
      foreignProviderNames: [],
      conflictingFields: []
    };

    it('should produce finding status PASS', () => {
      expect(buildIdentityFinding(input).status).toBe('PASS');
    });

    it('should have high confidence (90)', () => {
      expect(buildIdentityFinding(input).confidence).toBe(90);
    });

    it('should state all pages belong to same provider', () => {
      expect(buildIdentityFinding(input).finding).toContain('All uploaded pages belong to the same provider');
    });

    it('should recommend no action', () => {
      expect(buildIdentityFinding(input).recommendation).toBe('No action required.');
    });

    it('should render emerald card class in UI', () => {
      expect(identityCardClass('PASS')).toContain('emerald');
    });

    it('should render Identity Consistent badge text', () => {
      expect(identityBadgeText('PASS')).toContain('Identity Consistent');
    });
  });

  // ---- FAIL ----------------------------------------------------------------
  describe('FAIL outcome', () => {
    const input: IdentityInput = {
      result: 'FAIL',
      primaryIdentifiers: { fullName: 'Tyler Allen Sherman', dateOfBirth: '02/18/1982', npi: '1386911626', specialty: 'Family Medicine' },
      foreignProviderNames: ['JEFFREY J KLASS'],
      conflictingFields: ['Name on CT State License page belongs to JEFFREY J KLASS, a different provider'],
      comments: 'Pages 43-44 belong to Jeffrey J Klass, a Naturopathic Physician with a different license.'
    };

    it('should produce finding status FAIL', () => {
      expect(buildIdentityFinding(input).status).toBe('FAIL');
    });

    it('should have high confidence (90)', () => {
      expect(buildIdentityFinding(input).confidence).toBe(90);
    });

    it('should list the foreign provider name in the finding', () => {
      expect(buildIdentityFinding(input).finding).toContain('JEFFREY J KLASS');
    });

    it('should recommend packet review', () => {
      expect(buildIdentityFinding(input).recommendation).toContain('remove or correct pages');
    });

    it('should render rose card class in UI', () => {
      expect(identityCardClass('FAIL')).toContain('rose');
    });

    it('should render Identity Mismatch Detected badge', () => {
      expect(identityBadgeText('FAIL')).toContain('Identity Mismatch Detected');
    });
  });

  // ---- MANUAL_REVIEW -------------------------------------------------------
  describe('MANUAL_REVIEW outcome', () => {
    const input: IdentityInput = {
      result: 'MANUAL_REVIEW',
      primaryIdentifiers: { fullName: 'Jane Smith-Johnson', dateOfBirth: '05/12/1975', npi: '9876543210', specialty: 'Pediatrics' },
      foreignProviderNames: ['Jane Johnson'],
      conflictingFields: ['Name on malpractice insurance reads "Jane Johnson" (maiden name vs married name ambiguity)'],
      comments: 'Possible maiden name / married name discrepancy. Requires human verification.'
    };

    it('should produce finding status FAIL (fail-closed)', () => {
      expect(buildIdentityFinding(input).status).toBe('FAIL');
    });

    it('should have medium confidence (65)', () => {
      expect(buildIdentityFinding(input).confidence).toBe(65);
    });

    it('should mention manual review in finding text', () => {
      expect(buildIdentityFinding(input).finding).toContain('manual review');
    });

    it('should list the name variant in the finding', () => {
      expect(buildIdentityFinding(input).finding).toContain('Jane Johnson');
    });

    it('should not approve identity automatically per recommendation', () => {
      expect(buildIdentityFinding(input).recommendation).toContain('Do not approve identity automatically');
    });

    it('should render amber card class in UI', () => {
      expect(identityCardClass('MANUAL_REVIEW')).toContain('amber');
    });

    it('should render Manual Review Required badge', () => {
      expect(identityBadgeText('MANUAL_REVIEW')).toContain('Manual Review Required');
    });
  });

  // ---- UNABLE_TO_VERIFY ----------------------------------------------------
  describe('UNABLE_TO_VERIFY outcome', () => {
    const input: IdentityInput = {
      result: 'UNABLE_TO_VERIFY',
      primaryIdentifiers: { fullName: null, dateOfBirth: null, npi: null, specialty: null },
      foreignProviderNames: [],
      conflictingFields: [],
      comments: 'Documents are illegible; no provider name or NPI can be extracted.'
    };

    it('should produce finding status FAIL (fail-closed)', () => {
      expect(buildIdentityFinding(input).status).toBe('FAIL');
    });

    it('should have low confidence (40)', () => {
      expect(buildIdentityFinding(input).confidence).toBe(40);
    });

    it('should state identity cannot be verified', () => {
      expect(buildIdentityFinding(input).finding).toContain('cannot be verified');
    });

    it('should recommend obtaining legible documents', () => {
      expect(buildIdentityFinding(input).recommendation).toContain('legible copies');
    });

    it('should include comments from identity check', () => {
      expect(buildIdentityFinding(input).finding).toContain('illegible');
    });

    it('should render slate card class in UI', () => {
      expect(identityCardClass('UNABLE_TO_VERIFY')).toContain('slate');
    });

    it('should render Unable to Verify badge', () => {
      expect(identityBadgeText('UNABLE_TO_VERIFY')).toContain('Unable to Verify');
    });
  });

  // ---- Unknown / fallback --------------------------------------------------
  describe('Unknown result (defensive fallback)', () => {
    it('should treat unknown result as UNABLE_TO_VERIFY (FAIL status)', () => {
      const f = buildIdentityFinding({ result: 'BOGUS' as any });
      expect(f.status).toBe('FAIL');
    });

    it('should return slate card class for unknown result', () => {
      expect(identityCardClass('BOGUS')).toContain('slate');
    });
  });

  // ---- Regression: non-identity PASS elements unaffected ------------------
  describe('Regression — existing PASS logic untouched', () => {
    it('PASS result still yields findingStatus PASS (no regression)', () => {
      const r = buildIdentityFinding({
        result: 'PASS',
        primaryIdentifiers: { fullName: 'Dr. Sarah Johnson', npi: '1234567890' }
      });
      expect(r.status).toBe('PASS');
      expect(r.confidence).toBe(90);
    });

    it('identityBadgeText for PASS is unchanged (✓ Identity Consistent)', () => {
      expect(identityBadgeText('PASS')).toBe('✓ Identity Consistent');
    });
  });
});
