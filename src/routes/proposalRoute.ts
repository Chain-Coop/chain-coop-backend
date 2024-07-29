import { Router } from "express";
import {
  createProposal,
  getProposals,
  getProposal,
  updateProposal,
  deleteProposal,
} from "../controllers/proposalController";
import { authorize, authorizePermissions } from "../middlewares/authorization";

const router = Router();

router.route("/")
  .post(authorize, createProposal)
  .get(authorize, authorizePermissions("admin"), getProposals);

router.route("/:id")
  .get(authorize, getProposal)
  .patch(authorize, updateProposal)
  .delete(authorize, authorizePermissions("admin"), deleteProposal);

export default router;
