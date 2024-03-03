import bodyParser from "body-parser";
import express from "express";
import { BASE_ONION_ROUTER_PORT } from "../config";
import { generateRsaKeyPair, exportPrvKey, exportPubKey } from '../crypto';
import axios from 'axios';



export async function simpleOnionRouter(nodeId: number) {
  const onionRouter = express();
  onionRouter.use(express.json());
  onionRouter.use(bodyParser.json());

  let lastReceivedEncryptedMessage: string | null = null;
  let lastReceivedDecryptedMessage: string | null = null;
  let lastMessageDestination: string | null = null;

  const privateKeys = new Map<number, string>();
  let publicKey: string | null = null;
  // Generate a pair of private and public keys for each node when the server starts
  const { publicKey: generatedPublicKey, privateKey: generatedPrivateKey} = await generateRsaKeyPair();

  publicKey = await exportPubKey(generatedPublicKey);  // exporting the public key in base64 format
  const exportedPrivateKey = await exportPrvKey(generatedPrivateKey);  // exporting the private key in base64 format
  privateKeys.set(nodeId, exportedPrivateKey || '');

  const registryUrl = "http://localhost:8080";  // Replace with the actual registry URL
  try {
    await axios.post(`${registryUrl}/register`, { nodeId, pubKey: publicKey});
    console.log(`Node ${nodeId} registered successfully on the registry.`);
  } catch (error) {
    console.error(`Error registering node ${nodeId} on the registry`);
  }

  onionRouter.get('/getPrivateKey/:nodeId', (req, res) => {
    const privateKey = privateKeys.get(nodeId);
  
    if (privateKey) {
      res.send({ result: privateKey });
    } else {
      res.status(404).send({ error: 'Node not found' });
    }
  });

  // Status Route : 
  onionRouter.get('/status', (req, res) => {
    res.send('live')
  })

  // Route to get the last received encrypted message
  onionRouter.get("/getLastReceivedEncryptedMessage", (req, res) => {
    res.json({ result: lastReceivedEncryptedMessage });
  });

  // Route to get the last received decrypted message
  onionRouter.get("/getLastReceivedDecryptedMessage", (req, res) => {
    res.json({ result: lastReceivedDecryptedMessage });
  });

  // Route to get the last message destination
  onionRouter.get("/getLastMessageDestination", (req, res) => {
    res.json({ result: lastMessageDestination });
  });

  const server = onionRouter.listen(BASE_ONION_ROUTER_PORT + nodeId, () => {
    console.log(
      `Onion router ${nodeId} is listening on port ${
        BASE_ONION_ROUTER_PORT + nodeId
      }`
    );
  });

  return server;
}
