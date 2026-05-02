import { checkWriteReadiness } from "../dist/index.js";

const readiness = checkWriteReadiness();
console.log(JSON.stringify(readiness, null, 2));
