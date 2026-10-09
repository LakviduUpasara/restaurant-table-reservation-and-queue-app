import { app } from './app.js';
import { env } from './config/env.js';
app.listen(env.PORT, '0.0.0.0', () => console.log(`DineFlow API listening on 0.0.0.0:${env.PORT}`));
