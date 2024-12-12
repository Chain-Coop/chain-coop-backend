import {Router} from "express"
import { allowStableTokenAddressfForSaving,setFeeCollectionAddress,changeSavingContractOwnership,unlistStableTokenAddressfForSaving } from "../../../controllers/web3/chaincoopSaving/managementController"
import {authorize}  from "../../../middlewares/authorization"
const router = Router()
router.post("/allow",authorize,allowStableTokenAddressfForSaving)
router.post("/feeCollection",authorize,setFeeCollectionAddress)
router.post("/changeOwnership",authorize,changeSavingContractOwnership)
router.post("/unlist",authorize,unlistStableTokenAddressfForSaving)





export default router