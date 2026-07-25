export class CloudPathApiError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly status: number | null = null,
    public readonly details: unknown = null,
  ) {
    super(message);
    this.name = "CloudPathApiError";
  }
}
