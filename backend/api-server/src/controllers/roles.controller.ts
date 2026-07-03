import { Request, Response } from "express";
import * as repo from "../repositories/roles.repository";

export async function list(_req: Request, res: Response): Promise<void> {
  try {
    const data = await repo.findAllRoles();
    res.json(data);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
}
