import {Router} from "express"
import { userTokenBalance } from "../../controllers/web3/balanceController"
import {authorize}  from "../../middlewares/authorization"
const router = Router()
router.get("/token/:tokenId",authorize,userTokenBalance)



export default router;