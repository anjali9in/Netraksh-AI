export type AuthenticationValidationRequest = {
  employeeId: string;
  imagePath: string;
};

export type AuthenticationValidationResult = {
  authenticated: boolean;
};

export async function validateAuthenticationCapture(
  request: AuthenticationValidationRequest,
): Promise<AuthenticationValidationResult> {
  console.log('Validating authentication capture:', request);

  await new Promise<void>(resolve => setTimeout(resolve, 1200));

  return {
    authenticated: true,
  };
}
