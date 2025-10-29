import expres from "express";
import { changeOfficerStatus, getAllOfficers, getOfficer, removeOfficer, removeHouse, getHouse, getHouses, removeAdmin, addAdmin, addBackHouse, getAllUsers, addUser, approveUser, approveOfficer, rejectUser, sendAdminOtp, verifyAdminOtp, getPatrolStatistics } from "../controllers/adminController.js";

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
router.get("/users", getAllUsers);
router.post("/users/user", addUser);
router.put("/users/:id/approve", approveUser);
router.put("/users/:id/reject", rejectUser);
router.put("/officers/:id/approve", approveOfficer);
//router.post("/members", addMember);
router.post("/api/auth/admin/send-otp", sendAdminOtp);
router.post("/api/auth/admin/verify-otp", verifyAdminOtp);
router.get("/patrolStats", getPatrolStatistics);



export default router;