import { startReceivers } from './receive';

startReceivers('pdf_queue', 1).catch(console.error);
