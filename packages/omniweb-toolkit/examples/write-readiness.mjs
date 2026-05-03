import { checkWriteReadiness } from "../dist/runtime.js";

const readiness = checkWriteReadiness();
console.log(JSON.stringify(readiness, null, 2));
