export function validateEmployeeId(employeeId: string): boolean {
  return employeeId.trim().length >= 3;
}
