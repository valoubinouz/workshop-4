import bodyParser from "body-parser";
import express from "express";
import { BASE_ONION_ROUTER_PORT} from "../config";
import { generateRsaKeyPair, exportPrvKey, exportPubKey, rsaDecrypt, symDecrypt} from '../crypto';
import axios from 'axios';



export async function simpleOnionRouter(nodeId: number) {
  const onionRouter = express();
  onionRouter.use(express.json());
  onionRouter.use(bodyParser.json());


  let lastReceivedEncryptedMessage: string | null = null;
  let lastReceivedDecryptedMessage: string | null = null;
  let lastMessageDestination: number | null = null;


  // Generate a pair of private and public keys
  const { publicKey, privateKey} = await generateRsaKeyPair();

  let publicKb64 = await exportPubKey(publicKey);  // exporting the public key in base64 format
  let privKb64  = await exportPrvKey(privateKey);  // exporting the private key in base64 format
  
  const data = {
    nodeId,
    pubKey: publicKb64,
  };

  const registryUrl = "http://localhost:8080/registerNode";  
  try {
    await axios.post(registryUrl, data);
    console.log(`Node ${nodeId} registered successfully on the registry.`);
  } catch (error) {
    console.error(`Error registering node ${nodeId} on the registry`);
  }

  onionRouter.get('/getPrivateKey', (req, res) => {
    res.json({result : privKb64});
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

  onionRouter.post("/message", async (req, res) => {

    const {message} = req.body; 

    const decryptedKey = await rsaDecrypt(message.slice(0, 344), privateKey);
    const decryptedMessage = await symDecrypt(decryptedKey, message.slice(344));
    const nextDestination = parseInt(decryptedMessage.slice(0, 10), 10);
    const remainingMessage = decryptedMessage.slice(10);

    lastReceivedEncryptedMessage = message; 
    lastReceivedDecryptedMessage = remainingMessage;
    lastMessageDestination = nextDestination;

    try {
      await axios.post(`http://localhost:${nextDestination}/message`, { message: remainingMessage }, {
        headers: {
          "Content-Type": "application/json",
        },
      });
      res.status(200).send("success");
    } catch (error) {
      console.error(`Error sending message to the next destination:`);
      res.status(500).send("error");
    }
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
