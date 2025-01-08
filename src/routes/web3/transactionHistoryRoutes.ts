import {Router} from "express"
import { userTxHistory } from "../../controllers/web3/historyController"
import {authorize}  from "../../middlewares/authorization"
const router = Router()
router.get('/history',authorize,userTxHistory)


export default router