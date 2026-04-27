export class OmniwebError extends Error {
  constructor(message: string) {
    super(message);
    this.name = new.target.name;
  }
}

export class HttpError extends OmniwebError {
  readonly status: number;
  readonly url: string;
  readonly body: unknown;

  constructor(message: string, options: { status: number; url: string; body?: unknown }) {
    super(message);
    this.status = options.status;
    this.url = options.url;
    this.body = options.body;
  }
}

export class ParseError extends OmniwebError {
  readonly url: string;
  readonly bodyText: string;

  constructor(message: string, options: { url: string; bodyText: string }) {
    super(message);
    this.url = options.url;
    this.bodyText = options.bodyText;
  }
}

export class ReadinessError extends OmniwebError {}
