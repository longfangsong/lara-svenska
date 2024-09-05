import Semaphore from "semaphore-promise";

export const dbSemaphore = new Semaphore(6);
export const apiSemaphore = new Semaphore(6);