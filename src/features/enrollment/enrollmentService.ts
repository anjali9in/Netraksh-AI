export type EnrollmentValidationRequest = {
  employeeId: string;
  imagePath: string;
};

export type EnrollmentValidationResult = {
  accepted: boolean;
};

export async function validateEnrollmentCapture(
  request: EnrollmentValidationRequest,
): Promise<EnrollmentValidationResult> {
  console.log('Validating enrollment capture:', request);

  await new Promise<void>(resolve => setTimeout(resolve, 1200));

  return {
    accepted: true,
  };
}
