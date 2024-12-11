import {Router} from "express"
import { activate } from "../../controllers/web3/accountController";
import {authorize}  from "../../middlewares/authorization"
const router = Router()
router.post("/activate",authorize,activate)



export default router;