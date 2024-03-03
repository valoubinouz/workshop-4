import bodyParser from "body-parser";
import express, { Request, Response } from "express";
import { REGISTRY_PORT } from "../config";

export type Node = { nodeId: number; pubKey: string };

export type RegisterNodeBody = {
  nodeId: number;
  pubKey: string;
};

export type GetNodeRegistryBody = {
  nodes: Node[];
};
const registeredNodes: Node[] = [];


export async function launchRegistry() {
  const _registry = express();
  _registry.use(express.json());
  _registry.use(bodyParser.json());

  // TODO implement the status route
  _registry.get("/status", (req, res) => {
      res.send('live')
  });

  _registry.get("/getNodeRegistry", (req: Request, res: Response) => {
    const nodeRegistry: GetNodeRegistryBody = {
      nodes: registeredNodes,
    };
    res.json(nodeRegistry);
  });

  _registry.post("/register", async (req: Request<{}, {}, RegisterNodeBody>, res) => {
    const { nodeId, pubKey } = req.body;
    const newNode: Node = { nodeId, pubKey };
    registeredNodes.push(newNode);
    res.send({ nodeId, pubKey });
  });

  const server = _registry.listen(REGISTRY_PORT, () => {
    console.log(`registry is listening on port ${REGISTRY_PORT}`);
  });

  return server;
}
