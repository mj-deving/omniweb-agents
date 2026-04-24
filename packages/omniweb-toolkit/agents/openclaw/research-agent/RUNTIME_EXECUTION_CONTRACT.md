# Runtime Execution Contract

This document defines the **execution contract** for the OmniWeb alpha workspace: the exact sequence that must succeed before the runtime can be called **execution-proven**.

## Execution-proven means all of these succeed together

1. **Onboarding / workspace activation**
   - the workspace is active as the intended OpenClaw workspace
   - the portable bundle is discoverable from the runtime

2. **Provider auth usability**
   - the selected model/provider auth is not merely configured in files
   - it is actually usable for a real turn in the environment being tested

3. **Real local turn success**
   - a real local turn completes
   - it uses the intended workspace/skill context
   - it returns useful output rather than hanging or timing out

Until all three are proven together, this workspace is **not execution-proven**.
