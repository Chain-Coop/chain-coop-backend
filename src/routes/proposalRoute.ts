import { Router } from "express";
import {
    createProposal,
    getUserProposals,
    getAllProposals,
    getProposal,
    updateProposal,
    deleteProposal
} from "../controllers/proposalController";
import { authorize, authorizePermissions } from "../middlewares/authorization";

const router = Router();

router
    .route("/")
    .post(authorize, createProposal)
    .get(authorize, getUserProposals); // Get proposals for the logged-in user

router
    .route("/admin")
    .get(authorize, authorizePermissions("admin"), getAllProposals); // Get all proposals

router
    .route("/:id")
    .get(authorize, getProposal)
    .patch(authorize, updateProposal)
    .delete(authorize, deleteProposal); // a logged-in user can delete a proposal they created

export default router;
