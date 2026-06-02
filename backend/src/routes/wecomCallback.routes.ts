import { Router, Request, Response } from 'express';
import { asyncHandler } from '../middleware/errorHandler';
import { handleCallbackPost, verifyUrl } from '../services/wecomCallback.service';

const router = Router();

const getSignatureParams = (req: Request) => ({
  msgSignature: String(req.query.msg_signature || ''),
  timestamp: String(req.query.timestamp || ''),
  nonce: String(req.query.nonce || ''),
});

router.get('/callback', asyncHandler(async (req: Request, res: Response) => {
  const echoStr = String(req.query.echostr || '');
  if (!echoStr) {
    return res.status(400).send('missing echostr');
  }
  const plain = verifyUrl({ ...getSignatureParams(req), echoStr });
  return res.status(200).send(plain);
}));

router.post('/callback', asyncHandler(async (req: Request, res: Response) => {
  const rawXml = typeof req.body === 'string' ? req.body : '';
  if (!rawXml) {
    return res.status(400).send('missing xml body');
  }
  await handleCallbackPost(rawXml, getSignatureParams(req));
  return res.status(200).send('success');
}));

export default router;
