import expres from "express";
import { changeOfficerStatus, getAllOfficers, getOfficer, removeOfficer, removeHouse, getHouse, getHouses, removeAdmin, addAdmin, addBackHouse } from "../controllers/adminController.js";

const router = expres.Router();

router.get("/officers", getAllOfficers);
router.put("/officers/:id", changeOfficerStatus);
router.get("/officers/:id", getOfficer);
router.delete("/officers/:id", removeOfficer);
router.delete("/houses/:id", removeHouse);
router.put("/houses/:id", addBackHouse);
router.get("/houses/:id", getHouse);
router.get("/houses", getHouses);
router.post("/administrators", addAdmin);
router.delete("/administrators/:id", removeAdmin);


export default router;