import {Router} from "express"
import { withdrawFromPoolByID,openSavingPool,allUserPools,totalNumberPoolCreated,updatePoolWithAmount } from "../../../controllers/web3/chaincoopSaving/savingcontroller"
import {authorize}  from "../../../middlewares/authorization"
const router = Router()
router.post("/openPool",authorize,openSavingPool);
router.post("/updatePool",authorize,updatePoolWithAmount);
router.post("/withdraw",authorize,withdrawFromPoolByID);
router.get("/userPools",authorize,allUserPools);
router.get("/totalPools",authorize,totalNumberPoolCreated);

export default router