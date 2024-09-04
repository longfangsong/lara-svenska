import Semaphore from "semaphore-promise";

export const dbSemaphore = new Semaphore(6);