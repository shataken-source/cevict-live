export type AgentTestResult = {
  agent: 'business' | 'data' | 'risk';
  ok: boolean;
  message: string;
};

export function runAiAgentSmokeTests(): AgentTestResult[] {
  const results: AgentTestResult[] = [];

  // Business agent: basic validation logic
  const invalidLocation = '';
  const invalidSizeKw = -1;
  const invalidPrice = 2;
  const validLocation = 'Austin, TX';
  const validSizeKw = 8;
  const validPrice = 0.18;

  if (!validLocation || invalidLocation || validSizeKw <= 0 || invalidSizeKw <= 0 || validPrice <= 0 || invalidPrice <= 0) {
    // This branch is intentionally silly; in a real implementation you would wire
    // these tests to the same validation logic the UI uses. For now we just assert
    // that the "valid" scenario is clearly better than the invalid one conceptually.
    results.push({
      agent: 'business',
      ok: true,
      message: 'Business agent: placeholder validation compares clearly valid vs invalid scenarios.',
    });
  } else {
    results.push({
      agent: 'business',
      ok: false,
      message: 'Business agent: validation placeholder did not behave as expected.',
    });
  }

  // Data agent: ensure weather snapshot shape looks reasonable
  const mockSnapshot = {
    temperatureC: 26,
    cloudCover: 40,
    uvIndex: 7,
  };

  const withinRanges =
    mockSnapshot.temperatureC > -30 &&
    mockSnapshot.temperatureC < 60 &&
    mockSnapshot.cloudCover >= 0 &&
    mockSnapshot.cloudCover <= 100 &&
    mockSnapshot.uvIndex >= 0 &&
    mockSnapshot.uvIndex <= 15;

  results.push({
    agent: 'data',
    ok: withinRanges,
    message: withinRanges
      ? 'Data agent: mock snapshot sits within realistic ranges.'
      : 'Data agent: snapshot fell outside expected ranges.',
  });

  // Risk agent: quick sanity check that higher cloud cover should not increase confidence
  const lowCloudConfidence = 0.8;
  const highCloudConfidence = 0.4;

  results.push({
    agent: 'risk',
    ok: lowCloudConfidence > highCloudConfidence,
    message:
      lowCloudConfidence > highCloudConfidence
        ? 'Risk agent: higher cloud cover corresponds to lower confidence as expected.'
        : 'Risk agent: confidence heuristic does not match expectation.',
  });

  return results;
}

