# Runtime Limitations

This workspace currently has two important runtime limitations to keep in mind during alpha testing.

## 1) OpenClaw runtime CLI handshake issues may block real-turn proof

Possible observed behavior in current alpha environments:
- `openclaw --help` works
- gateway health endpoints work
- raw WebSocket connect works and yields `connect.challenge`
- runtime-oriented OpenClaw CLI commands hang or time out

Implication:
- do not treat runtime-oriented CLI status commands as the only validation gate when this failure mode is present
- separate bundle-valid checks from runtime-proven checks

## 2) Heavy runtime dependencies are not a trivial alpha assumption

Possible observed behavior in current alpha environments:
- heavyweight runtime dependencies are expensive to install or validate
- workspace package context may broaden dependency resolution

Implication:
- do not assume `npm install` is a trivial first step for alpha dogfooding
- treat heavyweight dependencies as documented runtime prerequisites unless and until installability is proven in the intended environment

## Practical rule

For now, treat this workspace as:
- **bundle-valid alpha** when docs/config/shape checks pass
- **not runtime-proven** until onboarding + auth + real local turn are proven together
