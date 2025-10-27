import { sql } from "../config/db.js";
import bcrypt from "bcrypt";
/** OFFICER ROUTES */

//get all officers
export const getAllOfficers = async (req, res) => {
   try {
        const officers = await sql`
            SELECT 
                so.officer_id,
                so.employee_id,
                so.suspension_start_date,
                so.suspension_end_date,
                so.suspension_reason,
                so.is_permanently_deleted,
                so.created_at,
                so.updated_at,
                u.email,
                u.phone_number,
                u.first_name,
                u.last_name,
                u.status,
                u.is_approved,
                u.last_login
            FROM security_officers so
            JOIN users u ON so.officer_id = u.user_id
            WHERE so.is_permanently_deleted = false
            ORDER BY so.created_at DESC
        `;
        console.log("officers fetched");
        res.status(200).json({ success: true, data: officers });
    } catch (error) {
        console.error("Error fetching officers:", error);
        res.status(500).json({ success: false, message: "Internal server error" });
    }
};

//suspend or revoke suspension
export const changeOfficerStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { action, suspension_reason, suspension_duration_days } = req.body;

        // Validation
        const validActions = ['suspend', 'activate'];
        if (!action || !validActions.includes(action)) {
            return res.status(400).json({ 
                success: false, 
                message: "Invalid action. Must be 'suspend' or 'activate'" 
            });
        }

        // Check if officer exists
        const officer = await sql`
            SELECT so.officer_id, u.first_name, u.last_name 
            FROM security_officers so
            JOIN users u ON so.officer_id = u.user_id
            WHERE so.officer_id = ${id} AND so.is_permanently_deleted = false
        `;

        if (officer.length === 0) {
            return res.status(404).json({ 
                success: false, 
                message: "Officer not found" 
            });
        }

        if (action === 'suspend') {
            // Validate suspension reason
            if (!suspension_reason) {
                return res.status(400).json({ 
                    success: false, 
                    message: "Suspension reason is required" 
                });
            }

            // Calculate suspension dates (default 90 days)
            const days = suspension_duration_days || 90;
            const suspension_start = new Date();
            const suspension_end = new Date();
            suspension_end.setDate(suspension_end.getDate() + days);

            // Update security officer
            await sql`
                UPDATE security_officers 
                SET 
                    suspension_start_date = ${suspension_start},
                    suspension_end_date = ${suspension_end},
                    suspension_reason = ${suspension_reason}
                WHERE officer_id = ${id}
            `;

            // Update user status
            await sql`
                UPDATE users 
                SET status = 'suspended'
                WHERE user_id = ${id}
            `;

            // Send notifications to all active members
            await sql`
                INSERT INTO notifications (
                    user_id, 
                    notification_type, 
                    subject, 
                    message,
                    related_entity_type,
                    related_entity_id
                )
                SELECT 
                    nm.member_id,
                    'email',
                    'Security Officer Suspended',
                    ${`Security officer ${officer[0].first_name} ${officer[0].last_name} has been suspended. Reason: ${suspension_reason}`},
                    'security_officer',
                    ${id}
                FROM neighborhood_members nm
                JOIN subscriptions s ON nm.member_id = s.member_id
                WHERE s.status = 'active'
            `;

            // Log the action
            await sql`
                INSERT INTO audit_logs (
                    user_id,
                    action_type,
                    entity_type,
                    entity_id,
                    new_value
                )
                VALUES (
                    ${req.user?.user_id || null},
                    'SUSPEND_OFFICER',
                    'security_officer',
                    ${id},
                    ${JSON.stringify({ suspension_reason, suspension_start, suspension_end })}
                )
            `;

            console.log(`Officer ${id} suspended`);
            res.status(200).json({ 
                success: true, 
                message: "Officer suspended successfully",
                data: { suspension_start, suspension_end }
            });

        } else if (action === 'activate') {
            // Clear suspension
            await sql`
                UPDATE security_officers 
                SET 
                    suspension_start_date = NULL,
                    suspension_end_date = NULL,
                    suspension_reason = NULL
                WHERE officer_id = ${id}
            `;

            // Update user status
            await sql`
                UPDATE users 
                SET status = 'active'
                WHERE user_id = ${id}
            `;

            // Send notifications to members
            await sql`
                INSERT INTO notifications (
                    user_id, 
                    notification_type, 
                    subject, 
                    message,
                    related_entity_type,
                    related_entity_id
                )
                SELECT 
                    nm.member_id,
                    'email',
                    'Security Officer Reactivated',
                    ${`Security officer ${officer[0].first_name} ${officer[0].last_name} has been reactivated and is back on duty.`},
                    'security_officer',
                    ${id}
                FROM neighborhood_members nm
                JOIN subscriptions s ON nm.member_id = s.member_id
                WHERE s.status = 'active'
            `;

            // Log the action
            await sql`
                INSERT INTO audit_logs (
                    user_id,
                    action_type,
                    entity_type,
                    entity_id
                )
                VALUES (
                    ${req.user?.user_id || null},
                    'ACTIVATE_OFFICER',
                    'security_officer',
                    ${id}
                )
            `;

            console.log(`Officer ${id} reactivated`);
            res.status(200).json({ 
                success: true, 
                message: "Officer reactivated successfully"
            });
        }
    } catch (error) {
        console.error("Error changing officer status:", error);
        res.status(500).json({ success: false, message: "Internal server error" });
    }
};

//retrieve a single officer
export const getOfficer = async (req, res) => {
    try {
        const { id } = req.params;

        const officer = await sql`
            SELECT 
                so.officer_id,
                so.employee_id,
                so.suspension_start_date,
                so.suspension_end_date,
                so.suspension_reason,
                so.is_permanently_deleted,
                so.approved_by_admin_id,
                so.created_at,
                so.updated_at,
                u.email,
                u.phone_number,
                u.first_name,
                u.last_name,
                u.status,
                u.is_approved,
                u.last_login,
                u.created_at as user_created_at
            FROM security_officers so
            JOIN users u ON so.officer_id = u.user_id
            WHERE so.officer_id = ${id} AND so.is_permanently_deleted = false
        `;

        if (officer.length === 0) {
            return res.status(404).json({ 
                success: false, 
                message: "Officer not found" 
            });
        }

        // Get patrol statistics
        const patrolStats = await sql`
            SELECT 
                COUNT(*) as total_scans,
                COUNT(DISTINCT qr_code_id) as unique_locations,
                MAX(scan_timestamp) as last_patrol,
                MIN(scan_timestamp) as first_patrol
            FROM patrol_scans
            WHERE officer_id = ${id}
        `;

        // Get recent patrols (last 10)
        const recentPatrols = await sql`
            SELECT 
                ps.scan_id,
                ps.scan_timestamp,
                ps.comments,
                qr.gate_name,
                qr.location_description
            FROM patrol_scans ps
            JOIN qr_codes qr ON ps.qr_code_id = qr.qr_code_id
            WHERE ps.officer_id = ${id}
            ORDER BY ps.scan_timestamp DESC
            LIMIT 10
        `;

        // Get anomalies for this officer
        const anomalies = await sql`
            SELECT 
                anomaly_id,
                anomaly_type,
                detection_date,
                status,
                notes
            FROM patrol_anomalies
            WHERE officer_id = ${id}
            ORDER BY detection_date DESC
            LIMIT 5
        `;

        res.status(200).json({ 
            success: true, 
            data: {
                ...officer[0],
                patrol_stats: patrolStats[0],
                recent_patrols: recentPatrols,
                anomalies: anomalies
            }
        });
    } catch (error) {
        console.error("Error fetching officer:", error);
        res.status(500).json({ success: false, message: "Internal server error" });
    }
};

//delete officer
export const removeOfficer = async (req, res) => {
    try {
        const { id } = req.params;

        // Check if officer exists
        const officer = await sql`
            SELECT so.officer_id, u.first_name, u.last_name 
            FROM security_officers so
            JOIN users u ON so.officer_id = u.user_id
            WHERE so.officer_id = ${id} AND so.is_permanently_deleted = false
        `;

        if (officer.length === 0) {
            return res.status(404).json({ 
                success: false, 
                message: "Officer not found" 
            });
        }

        // Soft delete the officer
        await sql`
            UPDATE security_officers 
            SET is_permanently_deleted = true
            WHERE officer_id = ${id}
        `;

        await sql`
            UPDATE users 
            SET status = 'deleted'
            WHERE user_id = ${id}
        `;

        // Notify members
        await sql`
            INSERT INTO notifications (
                user_id, 
                notification_type, 
                subject, 
                message,
                related_entity_type,
                related_entity_id
            )
            SELECT 
                nm.member_id,
                'email',
                'Security Officer Removed',
                ${`Security officer ${officer[0].first_name} ${officer[0].last_name} has been permanently removed from the system.`},
                'security_officer',
                ${id}
            FROM neighborhood_members nm
            JOIN subscriptions s ON nm.member_id = s.member_id
            WHERE s.status = 'active'
        `;

        // Create audit log
        await sql`
            INSERT INTO audit_logs (
                user_id,
                action_type,
                entity_type,
                entity_id,
                ip_address
            )
            VALUES (
                ${req.user?.user_id || null},
                'DELETE_OFFICER',
                'security_officer',
                ${id},
                ${req.ip || null}
            )
        `;

        console.log(`Officer ${id} removed successfully`);
        res.status(200).json({ 
            success: true, 
            message: "Officer removed successfully" 
        });
    } catch (error) {
        console.error("Error removing officer:", error);
        res.status(500).json({ success: false, message: "Internal server error" });
    }
};

/** HOUSE ROUTES */

//get all houses
export const getHouses = async (req, res) => {
    try {
        const houses = await sql`
            SELECT 
                h.house_id,
                h.house_number,
                h.street_address,
                h.status,
                h.created_at,
                h.updated_at,
                qr.qr_code_value,
                qr.gate_name,
                qr.is_active as qr_active,
                u.first_name as member_first_name,
                u.last_name as member_last_name,
                u.email as member_email,
                u.phone_number as member_phone,
                nm.subscription_status,
                s.missed_payments_count
            FROM houses h
            LEFT JOIN qr_codes qr ON h.qr_code_id = qr.qr_code_id
            LEFT JOIN neighborhood_members nm ON h.member_id = nm.member_id
            LEFT JOIN users u ON nm.member_id = u.user_id
            LEFT JOIN subscriptions s ON nm.member_id = s.member_id AND s.status != 'cancelled'
            WHERE h.status != 'deleted'
            ORDER BY h.created_at DESC
        `;

        console.log("Houses fetched");
        res.status(200).json({ 
            success: true, 
            data: houses 
        });
    } catch (error) {
        console.error("Error fetching houses:", error);
        res.status(500).json({ success: false, message: "Internal server error" });
    }
};

//remove a house for missed payments
export const removeHouse = async (req, res) => {
    try {
        const { id } = req.params;
        const { reason } = req.body;

        // Check if house exists
        const house = await sql`
            SELECT 
                h.house_id, 
                h.house_number, 
                h.street_address,
                h.member_id,
                u.first_name,
                u.last_name,
                u.email
            FROM houses h
            LEFT JOIN neighborhood_members nm ON h.member_id = nm.member_id
            LEFT JOIN users u ON nm.member_id = u.user_id
            WHERE h.house_id = ${id} AND h.status != 'deleted'
        `;

        if (house.length === 0) {
            return res.status(404).json({ 
                success: false, 
                message: "House not found" 
            });
        }

        // Update house status to suspended
        await sql`
            UPDATE houses 
            SET status = 'suspended'
            WHERE house_id = ${id}
        `;

        // If there's a member, update their subscription status
        if (house[0].member_id) {
            await sql`
                UPDATE neighborhood_members
                SET subscription_status = 'suspended'
                WHERE member_id = ${house[0].member_id}
            `;

            await sql`
                UPDATE subscriptions
                SET status = 'suspended'
                WHERE member_id = ${house[0].member_id} AND status = 'active'
            `;

            // Send notification to the member
            await sql`
                INSERT INTO notifications (
                    user_id, 
                    notification_type, 
                    subject, 
                    message,
                    related_entity_type,
                    related_entity_id
                )
                VALUES (
                    ${house[0].member_id},
                    'email',
                    'House Removed from Monitoring',
                    ${reason || `Your house at ${house[0].house_number} ${house[0].street_address} has been removed from security monitoring due to missed payments. Please contact administration.`},
                    'house',
                    ${id}
                )
            `;
        }

        // Notify security officers
        await sql`
            INSERT INTO notifications (
                user_id, 
                notification_type, 
                subject, 
                message,
                related_entity_type,
                related_entity_id
            )
            SELECT 
                so.officer_id,
                'push',
                'House Removed from Patrol',
                ${`House at ${house[0].house_number} ${house[0].street_address} has been removed from patrol monitoring.`},
                'house',
                ${id}
            FROM security_officers so
            JOIN users u ON so.officer_id = u.user_id
            WHERE u.status = 'active' AND so.is_permanently_deleted = false
        `;

        // Create audit log
        await sql`
            INSERT INTO audit_logs (
                user_id,
                action_type,
                entity_type,
                entity_id,
                old_value,
                new_value
            )
            VALUES (
                ${req.user?.user_id || null},
                'REMOVE_HOUSE',
                'house',
                ${id},
                ${JSON.stringify({ status: 'active' })},
                ${JSON.stringify({ status: 'suspended', reason })}
            )
        `;

        console.log(`House ${id} removed from monitoring`);
        res.status(200).json({ 
            success: true, 
            message: "House removed from monitoring successfully"
        });
    } catch (error) {
        console.error("Error removing house:", error);
        res.status(500).json({ success: false, message: "Internal server error" });
    }
};

//get a single house
export const getHouse = async (req, res) => {
    try {
        const { id } = req.params;

        const house = await sql`
            SELECT 
                h.house_id,
                h.house_number,
                h.street_address,
                h.status,
                h.created_at,
                h.updated_at,
                qr.qr_code_id,
                qr.qr_code_value,
                qr.gate_name,
                qr.location_description,
                qr.is_active as qr_active,
                nm.member_id,
                u.first_name as member_first_name,
                u.last_name as member_last_name,
                u.email as member_email,
                u.phone_number as member_phone,
                nm.subscription_status,
                nm.subscription_start_date,
                nm.last_payment_date,
                s.monthly_fee,
                s.missed_payments_count,
                s.status as subscription_status
            FROM houses h
            LEFT JOIN qr_codes qr ON h.qr_code_id = qr.qr_code_id
            LEFT JOIN neighborhood_members nm ON h.member_id = nm.member_id
            LEFT JOIN users u ON nm.member_id = u.user_id
            LEFT JOIN subscriptions s ON nm.member_id = s.member_id AND s.status != 'cancelled'
            WHERE h.house_id = ${id}
        `;

        if (house.length === 0) {
            return res.status(404).json({ 
                success: false, 
                message: "House not found" 
            });
        }

        // Get patrol history for this house (if QR code exists)
        let patrolHistory = [];
        if (house[0].qr_code_id) {
            patrolHistory = await sql`
                SELECT 
                    ps.scan_id,
                    ps.scan_timestamp,
                    ps.comments,
                    u.first_name as officer_first_name,
                    u.last_name as officer_last_name,
                    so.employee_id
                FROM patrol_scans ps
                JOIN security_officers so ON ps.officer_id = so.officer_id
                JOIN users u ON so.officer_id = u.user_id
                WHERE ps.qr_code_id = ${house[0].qr_code_id}
                ORDER BY ps.scan_timestamp DESC
                LIMIT 20
            `;
        }

        // Get payment history if member exists
        let paymentHistory = [];
        if (house[0].member_id) {
            paymentHistory = await sql`
                SELECT 
                    payment_id,
                    amount,
                    payment_method,
                    payment_status,
                    payment_date,
                    month_paid_for
                FROM payments
                WHERE member_id = ${house[0].member_id}
                ORDER BY payment_date DESC
                LIMIT 12
            `;
        }
        console.log("house fetched");
        res.status(200).json({ 
            success: true, 
            data: {
                ...house[0],
                patrol_history: patrolHistory,
                payment_history: paymentHistory
            }
        });
    } catch (error) {
        console.error("Error fetching house:", error);
        res.status(500).json({ success: false, message: "Internal server error" });
    }
};

//reinstate house for monitoring
export const addBackHouse = async (req, res) => {
    try {
        const { id } = req.params;

        // Check if house exists
        const house = await sql `
            SELECT 
                h.house_id, 
                h.house_number, 
                h.street_address,
                h.status,
                h.member_id,
                u.first_name,
                u.last_name,
                u.email
            FROM houses h
            LEFT JOIN neighborhood_members nm ON h.member_id = nm.member_id
            LEFT JOIN users u ON nm.member_id = u.user_id
            WHERE h.house_id = ${id}
        `;

        if (house.length === 0) {
            return res.status(404).json({ 
                success: false, 
                message: "House not found" 
            });
        }

        // Check if house is already active
        if (house[0].status === 'active') {
            return res.status(400).json({ 
                success: false, 
                message: "House is already active in monitoring" 
            });
        }

        // Reactivate the house
        await sql `
            UPDATE houses 
            SET status = 'active'
            WHERE house_id = ${id}
        `;

        // If there's a member, reactivate their subscription
        if (house[0].member_id) {
            await sql`
                UPDATE neighborhood_members
                SET subscription_status = 'active'
                WHERE member_id = ${house[0].member_id}
            `;

            await sql`
                UPDATE subscriptions
                SET 
                    status = 'active',
                    missed_payments_count = 0
                WHERE member_id = ${house[0].member_id} AND status = 'suspended'
            `;

            // Send notification to the member
            await sql `
                INSERT INTO notifications (
                    user_id, 
                    notification_type, 
                    subject, 
                    message,
                    related_entity_type,
                    related_entity_id
                )
                VALUES (
                    ${house[0].member_id},
                    'email',
                    'House Reinstated for Monitoring',
                    ${`Good news! Your house at ${house[0].house_number} ${house[0].street_address} has been reinstated for security monitoring. Patrols will resume immediately.`},
                    'house',
                    ${id}
                )
            `;
        }

        // Notify security officers
        await sql `
            INSERT INTO notifications (
                user_id, 
                notification_type, 
                subject, 
                message,
                related_entity_type,
                related_entity_id
            )
            SELECT 
                so.officer_id,
                'push',
                'House Added Back to Patrol',
                ${`House at ${house[0].house_number} ${house[0].street_address} has been reinstated for patrol monitoring.`},
                'house',
                ${id}
            FROM security_officers so
            JOIN users u ON so.officer_id = u.user_id
            WHERE u.status = 'active' AND so.is_permanently_deleted = false
        `;

        // Create audit log
        await sql`
            INSERT INTO audit_logs (
                user_id,
                action_type,
                entity_type,
                entity_id,
                old_value,
                new_value
            )
            VALUES (
                ${req.user?.user_id || null},
                'REINSTATE_HOUSE',
                'house',
                ${id},
                ${JSON.stringify({ status: house[0].status })},
                ${JSON.stringify({ status: 'active' })}
            )
        `;

        console.log(`House ${id} reinstated for monitoring`);
        res.status(200).json({ 
            success: true, 
            message: "House reinstated for monitoring successfully"
        });
    } catch (error) {
        console.error("Error reinstating house:", error);
        res.status(500).json({ success: false, message: "Internal server error" });
    }

    try {
        const { id } = req.params;

        const house = await sql `
            SELECT 
                h.house_id,
                h.house_number,
                h.street_address,
                h.status,
                h.created_at,
                h.updated_at,
                qr.qr_code_id,
                qr.qr_code_value,
                qr.gate_name,
                qr.location_description,
                qr.is_active as qr_active,
                nm.member_id,
                u.first_name as member_first_name,
                u.last_name as member_last_name,
                u.email as member_email,
                u.phone_number as member_phone,
                nm.subscription_status,
                nm.subscription_start_date,
                nm.last_payment_date,
                s.monthly_fee,
                s.missed_payments_count,
                s.status as subscription_status
            FROM houses h
            LEFT JOIN qr_codes qr ON h.qr_code_id = qr.qr_code_id
            LEFT JOIN neighborhood_members nm ON h.member_id = nm.member_id
            LEFT JOIN users u ON nm.member_id = u.user_id
            LEFT JOIN subscriptions s ON nm.member_id = s.member_id AND s.status != 'cancelled'
            WHERE h.house_id = ${id}
        `;

        if (house.length === 0) {
            return res.status(404).json({ 
                success: false, 
                message: "House not found" 
            });
        }

        // Get patrol history for this house (if QR code exists)
        let patrolHistory = [];
        if (house[0].qr_code_id) {
            patrolHistory = await sql`
                SELECT 
                    ps.scan_id,
                    ps.scan_timestamp,
                    ps.comments,
                    u.first_name as officer_first_name,
                    u.last_name as officer_last_name,
                    so.employee_id
                FROM patrol_scans ps
                JOIN security_officers so ON ps.officer_id = so.officer_id
                JOIN users u ON so.officer_id = u.user_id
                WHERE ps.qr_code_id = ${house[0].qr_code_id}
                ORDER BY ps.scan_timestamp DESC
                LIMIT 20
            `;
        }

        // Get payment history if member exists
        let paymentHistory = [];
        if (house[0].member_id) {
            paymentHistory = await sql`
                SELECT 
                    payment_id,
                    amount,
                    payment_method,
                    payment_status,
                    payment_date,
                    month_paid_for
                FROM payments
                WHERE member_id = ${house[0].member_id}
                ORDER BY payment_date DESC
                LIMIT 12
            `;
        }

        res.status(200).json({ 
            success: true, 
            data: {
                ...house[0],
                patrol_history: patrolHistory,
                payment_history: paymentHistory
            }
        });
    } catch (error) {
        console.error("Error fetching house:", error);
        res.status(500).json({ success: false, message: "Internal server error" });
    }
};


/** ADMIN ROUTES */

//create new admin account
export const addAdmin = async (req, res) => {
    try {
        const { 
            email, 
            password, 
            phone_number, 
            first_name, 
            last_name,
            can_modify_system_config 
        } = req.body;

        // Validation
        if (!email || !password || !phone_number || !first_name || !last_name) {
            return res.status(400).json({ 
                success: false, 
                message: "All fields are required" 
            });
        }

        // Check if email already exists
        const existingUser = await sql`
            SELECT user_id FROM users WHERE email = ${email}
        `;

        if (existingUser.length > 0) {
            return res.status(409).json({ 
                success: false, 
                message: "Email already registered" 
            });
        }

        // Hash password
        const password_hash = await bcrypt.hash(password, 10);

        // Get the creating admin's ID from authenticated user
        const created_by_admin_id = req.user?.user_id || null;

        // Insert user first
        const newUser = await sql`
            INSERT INTO users (
                email, 
                password_hash, 
                phone_number, 
                first_name, 
                last_name, 
                user_type, 
                status,
                is_approved
            )
            VALUES (
                ${email}, 
                ${password_hash}, 
                ${phone_number}, 
                ${first_name}, 
                ${last_name}, 
                'admin',
                'active',
                true
            )
            RETURNING user_id, email, first_name, last_name, phone_number, user_type
        `;

        // Insert into administrators table
        const newAdmin = await sql`
            INSERT INTO administrators (
                admin_id, 
                created_by_admin_id,
                can_modify_system_config
            )
            VALUES (
                ${newUser[0].user_id}, 
                ${created_by_admin_id},
                ${can_modify_system_config || false}
            )
            RETURNING *
        `;

        // Create audit log
        await sql`
            INSERT INTO audit_logs (
                user_id,
                action_type,
                entity_type,
                entity_id,
                new_value
            )
            VALUES (
                ${created_by_admin_id},
                'CREATE_ADMIN',
                'administrator',
                ${newUser[0].user_id},
                ${JSON.stringify({ 
                    email, 
                    can_modify_system_config: can_modify_system_config || false 
                })}
            )
        `;

        console.log("Admin added successfully");
        res.status(201).json({ 
            success: true, 
            message: "Admin account created successfully",
            data: {
                ...newUser[0],
                can_modify_system_config: newAdmin[0].can_modify_system_config
            }
        });
    } catch (error) {
        console.error("Error adding admin:", error);
        res.status(500).json({ success: false, message: "Internal server error" });
    }
};

//remove admin
export const removeAdmin = async (req, res) => {
    try {
        const { id } = req.params;

        // Check if trying to delete self
        if (req.user?.user_id === id) {
            return res.status(400).json({ 
                success: false, 
                message: "You cannot delete your own admin account" 
            });
        }

        // Check if admin exists
        const admin = await sql`
            SELECT a.admin_id, u.first_name, u.last_name, u.email, a.can_modify_system_config
            FROM administrators a
            JOIN users u ON a.admin_id = u.user_id
            WHERE a.admin_id = ${id}
        `;

        if (admin.length === 0) {
            return res.status(404).json({ 
                success: false, 
                message: "Admin not found" 
            });
        }

        // Check if the requesting admin has permission to delete admins with system config privileges
        if (admin[0].can_modify_system_config) {
            const requestingAdmin = await sql`
                SELECT can_modify_system_config 
                FROM administrators 
                WHERE admin_id = ${req.user?.user_id}
            `;

            if (requestingAdmin.length === 0 || !requestingAdmin[0].can_modify_system_config) {
                return res.status(403).json({ 
                    success: false, 
                    message: "You don't have permission to remove an admin with system configuration privileges" 
                });
            }
        }

        // Check if this admin has created other admins
        const createdAdmins = await sql`
            SELECT COUNT(*) as count
            FROM administrators
            WHERE created_by_admin_id = ${id}
        `;

        if (parseInt(createdAdmins[0].count) > 0) {
            return res.status(400).json({ 
                success: false, 
                message: `Cannot delete admin. This admin has created ${createdAdmins[0].count} other admin account(s). Please reassign or remove those accounts first.` 
            });
        }

        // Delete admin record (this will cascade to user due to ON DELETE CASCADE)
        await sql`
            DELETE FROM administrators
            WHERE admin_id = ${id}
        `;

        await sql`
            DELETE FROM users
            WHERE user_id = ${id}
        `;

        // Create audit log
        await sql`
            INSERT INTO audit_logs (
                user_id,
                action_type,
                entity_type,
                entity_id,
                old_value
            )
            VALUES (
                ${req.user?.user_id || null},
                'DELETE_ADMIN',
                'administrator',
                ${id},
                ${JSON.stringify({ 
                    email: admin[0].email,
                    name: `${admin[0].first_name} ${admin[0].last_name}`,
                    can_modify_system_config: admin[0].can_modify_system_config
                })}
            )
        `;

        console.log(`Admin ${id} removed successfully`);
        res.status(200).json({ 
            success: true, 
            message: "Admin account removed successfully" 
        });
    } catch (error) {
        console.error("Error removing admin:", error);
        res.status(500).json({ success: false, message: "Internal server error" });
    }
};

/**users routes */
//get all users
export const getAllUsers = async (req, res) => {
    try {
        const users = await sql`
            SELECT 
                u.user_id,
                u.email,
                u.phone_number,
                u.first_name,
                u.last_name,
                u.user_type,
                u.status,
                u.is_approved,
                u.last_login,
                u.created_at,
                u.updated_at,
                CASE 
                    WHEN u.user_type = 'admin' THEN (
                        SELECT json_build_object(
                            'can_modify_system_config', a.can_modify_system_config,
                            'created_by_admin_id', a.created_by_admin_id
                        )
                        FROM administrators a 
                        WHERE a.admin_id = u.user_id
                    )
                    WHEN u.user_type = 'security_officer' THEN (
                        SELECT json_build_object(
                            'employee_id', so.employee_id,
                            'suspension_start_date', so.suspension_start_date,
                            'suspension_end_date', so.suspension_end_date,
                            'suspension_reason', so.suspension_reason,
                            'is_permanently_deleted', so.is_permanently_deleted
                        )
                        FROM security_officers so 
                        WHERE so.officer_id = u.user_id
                    )
                    WHEN u.user_type = 'neighborhood_member' THEN (
                        SELECT json_build_object(
                            'subscription_status', nm.subscription_status,
                            'subscription_start_date', nm.subscription_start_date,
                            'last_payment_date', nm.last_payment_date
                        )
                        FROM neighborhood_members nm 
                        WHERE nm.member_id = u.user_id
                    )
                    ELSE NULL
                END as role_details
            FROM users u
            WHERE u.status != 'deleted'
            ORDER BY u.created_at DESC
        `;

        console.log("All users fetched");
        res.status(200).json({ 
            success: true, 
            data: users,
            count: users.length
        });
    } catch (error) {
        console.error("Error fetching all users:", error);
        res.status(500).json({ success: false, message: "Internal server error" });
    }
};
export const getMembers = async (req, res) => {
  try {
    const query = `
      SELECT 
        user_id,
        first_name,
        last_name,
        email,
        phone_number,
        user_type,
        status,
        is_approved,
        last_login,
        created_at,
        updated_at
      FROM users
      WHERE user_type = 'neighborhood_member'
      ORDER BY created_at DESC
    `;

    const [members] = await pool.query(query);

    return res.status(200).json({
      success: true,
      message: 'Members retrieved successfully',
      data: members,
      count: members.length
    });

  } catch (error) {
    console.error('Error fetching members:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch members',
      error: error.message
    });
  }
};
/**
 * Add a new user (supports all user types: admin, security_officer, neighborhood_member)
 * @route POST /api/admin/users
 */
export const addUser = async (req, res) => {
  try {
    const {
      first_name,
      last_name,
      email,
      phone_number,
      password,
      user_type,
      status = 'pending_approval',
      is_approved = false,
      // Member-specific fields
      house_number,
      street_address,
      subscription_status = 'active',
      subscription_start_date,
      // Officer-specific fields
      employee_id,
      // Admin-specific fields
      can_modify_system_config = false
    } = req.body;

    // ============================================
    // VALIDATION
    // ============================================
    
    // Required fields validation
    if (!first_name || !last_name || !email || !password || !user_type) {
      return res.status(400).json({
        success: false,
        message: 'First name, last name, email, password, and user_type are required'
      });
    }

    // Validate user_type
    const validUserTypes = ['admin', 'security_officer', 'neighborhood_member'];
    if (!validUserTypes.includes(user_type)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid user_type. Must be: admin, security_officer, or neighborhood_member'
      });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid email format'
      });
    }

    // Validate phone number if provided
    if (phone_number) {
      const phoneRegex = /^[0-9+\-\s()]+$/;
      if (!phoneRegex.test(phone_number)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid phone number format'
        });
      }
    }

    // Validate status
    const validStatuses = ['pending_approval', 'active', 'inactive', 'suspended', 'deleted'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status. Must be: pending_approval, active, inactive, suspended, or deleted'
      });
    }

    // Validate password strength
    if (password.length < 8) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 8 characters long'
      });
    }

    // ============================================
    // CHECK FOR DUPLICATES
    // ============================================
    
    const existingUser = await sql`
      SELECT user_id, email 
      FROM users 
      WHERE email = ${email}
    `;

    if (existingUser.length > 0) {
      return res.status(409).json({
        success: false,
        message: 'Email already exists',
        existingUserId: existingUser[0].user_id
      });
    }

    // ============================================
    // HASH PASSWORD
    // ============================================
    
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // ============================================
    // INSERT NEW USER
    // ============================================
    
    const newUser = await sql`
      INSERT INTO users (
        first_name,
        last_name,
        email,
        phone_number,
        password_hash,
        user_type,
        status,
        is_approved,
        created_at,
        updated_at
      ) VALUES (
        ${first_name},
        ${last_name},
        ${email},
        ${phone_number || null},
        ${hashedPassword},
        ${user_type}::user_type_enum,
        ${status}::user_status_enum,
        ${is_approved},
        CURRENT_TIMESTAMP,
        CURRENT_TIMESTAMP
      )
      RETURNING 
        user_id,
        first_name,
        last_name,
        email,
        phone_number,
        user_type,
        status,
        is_approved,
        created_at,
        updated_at
    `;

    const userId = newUser[0].user_id;

    // ============================================
    // CREATE RELATED RECORDS BASED ON USER TYPE
    // ============================================
    
    if (user_type === 'security_officer') {
      // Create security officer record
      const generatedEmployeeId = employee_id || `SO-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
      
      await sql`
        INSERT INTO security_officers (
          officer_id,
          employee_id,
          approved_by_admin_id,
          is_permanently_deleted,
          created_at,
          updated_at
        ) VALUES (
          ${userId},
          ${generatedEmployeeId},
          ${req.user?.user_id || null},
          false,
          CURRENT_TIMESTAMP,
          CURRENT_TIMESTAMP
        )
      `;

      console.log(`✅ Security officer created with employee_id: ${generatedEmployeeId}`);
    } 
    else if (user_type === 'neighborhood_member') {
      // Create neighborhood member record
      await sql`
        INSERT INTO neighborhood_members (
          member_id,
          house_number,
          street_address,
          subscription_status,
          subscription_start_date,
          approved_by_admin_id,
          created_at,
          updated_at
        ) VALUES (
          ${userId},
          ${house_number || null},
          ${street_address || null},
          ${subscription_status || 'active'}::subscription_status_enum,
          ${subscription_start_date || null},
          ${req.user?.user_id || null},
          CURRENT_TIMESTAMP,
          CURRENT_TIMESTAMP
        )
      `;

      console.log(`✅ Neighborhood member created`);
    }
    else if (user_type === 'admin') {
      // Create administrator record
      await sql`
        INSERT INTO administrators (
          admin_id,
          created_by_admin_id,
          can_modify_system_config,
          created_at
        ) VALUES (
          ${userId},
          ${req.user?.user_id || null},
          ${can_modify_system_config},
          CURRENT_TIMESTAMP
        )
      `;

      console.log(`✅ Administrator created with can_modify_system_config: ${can_modify_system_config}`);
    }

    // ============================================
    // SUCCESS RESPONSE
    // ============================================
    
    console.log(`✅ User created: ${userId} - ${user_type}`);
    
    return res.status(201).json({
      success: true,
      message: `${getUserTypeLabel(user_type)} created successfully`,
      data: newUser[0]
    });

  } catch (error) {
    console.error('❌ Error adding user:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to add user',
      error: error.message
    });
  }
};



/**
 * Helper function to get user-friendly label for user type
 */
function getUserTypeLabel(userType) {
  const labels = {
    'admin': 'Administrator',
    'security_officer': 'Security Officer',
    'neighborhood_member': 'Neighborhood Member'
  };
  return labels[userType] || 'User';
}

/**
 * Get a single member by ID
 * @route GET /api/members/:id
 */
export const getMember = async (req, res) => {
  try {
    const { id } = req.params;

    // Validate ID
    if (!id || isNaN(id)) {
      return res.status(400).json({
        success: false,
        message: 'Valid member ID is required'
      });
    }

    const query = `
      SELECT 
        user_id,
        first_name,
        last_name,
        email,
        phone_number,
        user_type,
        status,
        is_approved,
        last_login,
        created_at,
        updated_at
      FROM users
      WHERE user_id = ? AND user_type = 'neighborhood_member'
    `;

    const [members] = await pool.query(query, [id]);

    if (members.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Member not found'
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Member retrieved successfully',
      data: members[0]
    });

  } catch (error) {
    console.error('Error fetching member:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch member',
      error: error.message
    });
  }
};

/**
 * Add a new member
 * @route POST /api/members
 */
export const addMember = async (req, res) => {
  try {
    const {
      first_name,
      last_name,
      email,
      phone_number,
      password,
      status = 'active',
      is_approved = false
    } = req.body;

    // Validation
    if (!first_name || !last_name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: 'First name, last name, email, and password are required'
      });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid email format'
      });
    }

    // Validate phone number if provided
    if (phone_number) {
      const phoneRegex = /^[0-9+\-\s()]+$/;
      if (!phoneRegex.test(phone_number)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid phone number format'
        });
      }
    }

    // Check if email already exists
    const [existingUser] = await pool.query(
      'SELECT user_id FROM users WHERE email = ?',
      [email]
    );

    if (existingUser.length > 0) {
      return res.status(409).json({
        success: false,
        message: 'Email already exists'
      });
    }

    // Hash password
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // Insert new member
    const insertQuery = `
      INSERT INTO users (
        first_name,
        last_name,
        email,
        phone_number,
        password_hash,
        user_type,
        status,
        is_approved,
        created_at,
        updated_at
      ) VALUES (?, ?, ?, ?, ?, 'neighborhood_member', ?, ?, NOW(), NOW())
    `;

    const [result] = await pool.query(insertQuery, [
      first_name,
      last_name,
      email,
      phone_number || null,
      hashedPassword,
      status,
      is_approved
    ]);

    // Fetch the newly created member
    const [newMember] = await pool.query(
      `SELECT 
        user_id,
        first_name,
        last_name,
        email,
        phone_number,
        user_type,
        status,
        is_approved,
        created_at
      FROM users
      WHERE user_id = ?`,
      [result.insertId]
    );

    return res.status(201).json({
      success: true,
      message: 'Member created successfully',
      data: newMember[0]
    });

  } catch (error) {
    console.error('Error adding member:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to add member',
      error: error.message
    });
  }
};

/**
 * Update a member
 * @route PUT /api/members/:id
 */
export const updateMember = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      first_name,
      last_name,
      email,
      phone_number,
      status,
      is_approved
    } = req.body;

    // Validate ID
    if (!id || isNaN(id)) {
      return res.status(400).json({
        success: false,
        message: 'Valid member ID is required'
      });
    }

    // Check if member exists
    const [existingMember] = await pool.query(
      'SELECT user_id FROM users WHERE user_id = ? AND user_type = ?',
      [id, 'neighborhood_member']
    );

    if (existingMember.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Member not found'
      });
    }

    // If email is being updated, check for duplicates
    if (email) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid email format'
        });
      }

      const [duplicateEmail] = await pool.query(
        'SELECT user_id FROM users WHERE email = ? AND user_id != ?',
        [email, id]
      );

      if (duplicateEmail.length > 0) {
        return res.status(409).json({
          success: false,
          message: 'Email already exists'
        });
      }
    }

    // Build update query dynamically
    const updates = [];
    const values = [];

    if (first_name !== undefined) {
      updates.push('first_name = ?');
      values.push(first_name);
    }
    if (last_name !== undefined) {
      updates.push('last_name = ?');
      values.push(last_name);
    }
    if (email !== undefined) {
      updates.push('email = ?');
      values.push(email);
    }
    if (phone_number !== undefined) {
      updates.push('phone_number = ?');
      values.push(phone_number);
    }
    if (status !== undefined) {
      updates.push('status = ?');
      values.push(status);
    }
    if (is_approved !== undefined) {
      updates.push('is_approved = ?');
      values.push(is_approved);
    }

    if (updates.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No fields to update'
      });
    }

    updates.push('updated_at = NOW()');
    values.push(id);

    const updateQuery = `
      UPDATE users 
      SET ${updates.join(', ')}
      WHERE user_id = ? AND user_type = 'neighborhood_member'
    `;

    await pool.query(updateQuery, values);

    // Fetch updated member
    const [updatedMember] = await pool.query(
      `SELECT 
        user_id,
        first_name,
        last_name,
        email,
        phone_number,
        user_type,
        status,
        is_approved,
        last_login,
        created_at,
        updated_at
      FROM users
      WHERE user_id = ?`,
      [id]
    );

    return res.status(200).json({
      success: true,
      message: 'Member updated successfully',
      data: updatedMember[0]
    });

  } catch (error) {
    console.error('Error updating member:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to update member',
      error: error.message
    });
  }
};

/**
 * Delete a member (soft delete by setting status to 'deleted')
 * @route DELETE /api/members/:id
 */
export const deleteMember = async (req, res) => {
  try {
    const { id } = req.params;

    // Validate ID
    if (!id || isNaN(id)) {
      return res.status(400).json({
        success: false,
        message: 'Valid member ID is required'
      });
    }

    // Check if member exists
    const [existingMember] = await pool.query(
      'SELECT user_id FROM users WHERE user_id = ? AND user_type = ?',
      [id, 'neighborhood_member']
    );

    if (existingMember.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Member not found'
      });
    }

    // Soft delete - update status to 'deleted'
    await pool.query(
      `UPDATE users 
       SET status = 'deleted', updated_at = NOW() 
       WHERE user_id = ? AND user_type = 'neighborhood_member'`,
      [id]
    );

    return res.status(200).json({
      success: true,
      message: 'Member deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting member:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to delete member',
      error: error.message
    });
  }
};



/**
 * Approve a user (member or admin)
 * @route PATCH /api/admin/users/:id/approve
 */
export const approveUser = async (req, res) => {
  try {
    const { id } = req.params;
    const { approval_notes } = req.body;

    // ============================================
    // VALIDATION
    // ============================================

    // Validate ID format (UUID)
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!id || !uuidRegex.test(id)) {
      return res.status(400).json({
        success: false,
        message: 'Valid user ID (UUID) is required'
      });
    }

    // ============================================
    // CHECK IF USER EXISTS
    // ============================================

    const user = await sql`
      SELECT user_id, first_name, last_name, email, user_type, status, is_approved
      FROM users
      WHERE user_id = ${id}
    `;

    if (user.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const currentUser = user[0];

    // Check if user is a security officer (should use the officer-specific endpoint)
    if (currentUser.user_type === 'security_officer') {
      return res.status(400).json({
        success: false,
        message: 'Please use the security officer approval endpoint for officers'
      });
    }

    // Check if already approved
    if (currentUser.is_approved && currentUser.status === 'active') {
      return res.status(400).json({
        success: false,
        message: 'User is already approved and active'
      });
    }

    // ============================================
    // UPDATE USER APPROVAL STATUS
    // ============================================

    const updatedUser = await sql`
      UPDATE users
      SET 
        is_approved = true,
        status = 'active'::user_status_enum,
        updated_at = CURRENT_TIMESTAMP
      WHERE user_id = ${id}
      RETURNING 
        user_id,
        first_name,
        last_name,
        email,
        phone_number,
        user_type,
        status,
        is_approved,
        updated_at
    `;

    // ============================================
    // UPDATE RELATED TABLE (if neighborhood member)
    // ============================================

    if (currentUser.user_type === 'neighborhood_member') {
      await sql`
        UPDATE neighborhood_members
        SET 
          approved_by_admin_id = ${req.user?.user_id || null},
          updated_at = CURRENT_TIMESTAMP
        WHERE member_id = ${id}
      `;
    }

    // ============================================
    // SEND NOTIFICATION TO USER
    // ============================================

    const notificationMessage = `Your account has been approved! You can now access all features of the Neighborhood Watch system.`;

    await sql`
      INSERT INTO notifications (
        user_id,
        notification_type,
        subject,
        message,
        related_entity_type,
        related_entity_id,
        created_at
      ) VALUES (
        ${id},
        'email',
        'Account Approved',
        ${notificationMessage},
        'user',
        ${id},
        CURRENT_TIMESTAMP
      )
    `;

    // ============================================
    // LOG THE ACTION
    // ============================================

    await sql`
      INSERT INTO audit_logs (
        user_id,
        action_type,
        entity_type,
        entity_id,
        old_value,
        new_value,
        created_at
      ) VALUES (
        ${req.user?.user_id || null},
        'APPROVE_USER',
        'user',
        ${id},
        ${JSON.stringify({ is_approved: currentUser.is_approved, status: currentUser.status })},
        ${JSON.stringify({ is_approved: true, status: 'active', approval_notes: approval_notes || 'Approved by admin' })},
        CURRENT_TIMESTAMP
      )
    `;

    // ============================================
    // SUCCESS RESPONSE
    // ============================================

    console.log(`✅ User approved: ${id}`);

    return res.status(200).json({
      success: true,
      message: 'User approved successfully',
      data: updatedUser[0]
    });

  } catch (error) {
    console.error('❌ Error approving user:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to approve user',
      error: error.message
    });
  }
};

/**
 * Reject a user (member or admin)
 * @route PATCH /api/admin/users/:id/reject
 */
export const rejectUser = async (req, res) => {
  try {
    const { id } = req.params;
    const { rejection_reason } = req.body;

    // ============================================
    // VALIDATION
    // ============================================

    // Validate ID format (UUID)
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!id || !uuidRegex.test(id)) {
      return res.status(400).json({
        success: false,
        message: 'Valid user ID (UUID) is required'
      });
    }

    // Validate rejection reason
    if (!rejection_reason || !rejection_reason.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Rejection reason is required'
      });
    }

    // ============================================
    // CHECK IF USER EXISTS
    // ============================================

    const user = await sql`
      SELECT user_id, first_name, last_name, email, user_type, status, is_approved
      FROM users
      WHERE user_id = ${id}
    `;

    if (user.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const currentUser = user[0];

    // Check if user is a security officer (should use the officer-specific endpoint)
    if (currentUser.user_type === 'security_officer') {
      return res.status(400).json({
        success: false,
        message: 'Please use the security officer rejection endpoint for officers'
      });
    }

    // Check if already rejected
    if (!currentUser.is_approved && currentUser.status === 'inactive') {
      return res.status(400).json({
        success: false,
        message: 'User is already rejected and inactive'
      });
    }

    // ============================================
    // UPDATE USER APPROVAL STATUS
    // ============================================

    const updatedUser = await sql`
      UPDATE users
      SET 
        is_approved = false,
        status = 'inactive'::user_status_enum,
        updated_at = CURRENT_TIMESTAMP
      WHERE user_id = ${id}
      RETURNING 
        user_id,
        first_name,
        last_name,
        email,
        phone_number,
        user_type,
        status,
        is_approved,
        updated_at
    `;

    // ============================================
    // UPDATE RELATED TABLE (if neighborhood member)
    // ============================================

    if (currentUser.user_type === 'neighborhood_member') {
      await sql`
        UPDATE neighborhood_members
        SET 
          approved_by_admin_id = ${req.user?.user_id || null},
          updated_at = CURRENT_TIMESTAMP
        WHERE member_id = ${id}
      `;
    }

    // ============================================
    // SEND NOTIFICATION TO USER
    // ============================================

    // CORRECT SCHEMA for notifications table:
    // - notification_id: UUID PRIMARY KEY
    // - user_id: UUID NOT NULL
    // - notification_type: notification_type_enum NOT NULL
    // - subject: VARCHAR(255)
    // - message: TEXT NOT NULL
    // - sent_at: TIMESTAMP
    // - delivery_status: VARCHAR(50)
    // - related_entity_type: VARCHAR(50)
    // - related_entity_id: UUID
    // - created_at: TIMESTAMP DEFAULT CURRENT_TIMESTAMP

    const notificationMessage = `Your account approval has been rejected. Reason: ${rejection_reason}. Please contact the administrator for more information.`;

    await sql`
      INSERT INTO notifications (
        user_id,
        notification_type,
        subject,
        message,
        delivery_status,
        related_entity_type,
        related_entity_id,
        created_at
      ) VALUES (
        ${id},
        'email',
        'Account Approval Rejected',
        ${notificationMessage},
        'pending',
        'user',
        ${id},
        CURRENT_TIMESTAMP
      )
    `;

    // ============================================
    // LOG THE ACTION
    // ============================================

    // CORRECT SCHEMA for audit_logs table:
    // - log_id: UUID PRIMARY KEY
    // - user_id: UUID
    // - action_type: VARCHAR(100) NOT NULL
    // - entity_type: VARCHAR(100)
    // - entity_id: UUID
    // - old_value: JSONB
    // - new_value: JSONB
    // - ip_address: INET
    // - created_at: TIMESTAMP DEFAULT CURRENT_TIMESTAMP

    await sql`
      INSERT INTO audit_logs (
        user_id,
        action_type,
        entity_type,
        entity_id,
        old_value,
        new_value,
        created_at
      ) VALUES (
        ${req.user?.user_id || null},
        'REJECT_USER',
        'user',
        ${id},
        ${JSON.stringify({ 
          is_approved: currentUser.is_approved, 
          status: currentUser.status 
        })},
        ${JSON.stringify({ 
          is_approved: false, 
          status: 'inactive', 
          rejection_reason 
        })},
        CURRENT_TIMESTAMP
      )
    `;

    // ============================================
    // SUCCESS RESPONSE
    // ============================================

    console.log(`✅ User rejected: ${id} - Reason: ${rejection_reason}`);

    return res.status(200).json({
      success: true,
      message: 'User rejected successfully',
      data: updatedUser[0]
    });

  } catch (error) {
    console.error('❌ Error rejecting user:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to reject user',
      error: error.message
    });
  }
};


/**
 * Approve or reject a security officer
 * @route PATCH /api/admin/officers/:id/approve
 */
export const approveOfficer = async (req, res) => {
  try {
    const { id } = req.params;
    const { is_approved, employee_id, approval_notes } = req.body;

    // ============================================
    // VALIDATION
    // ============================================

    // Validate ID format (UUID)
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!id || !uuidRegex.test(id)) {
      return res.status(400).json({
        success: false,
        message: 'Valid officer ID (UUID) is required'
      });
    }

    // Validate is_approved
    if (typeof is_approved !== 'boolean') {
      return res.status(400).json({
        success: false,
        message: 'is_approved must be a boolean value (true or false)'
      });
    }

    // ============================================
    // CHECK IF OFFICER EXISTS
    // ============================================

    const officer = await sql`
      SELECT 
        u.user_id,
        u.first_name,
        u.last_name,
        u.email,
        u.user_type,
        u.status,
        u.is_approved,
        so.employee_id,
        so.is_permanently_deleted
      FROM users u
      JOIN security_officers so ON u.user_id = so.officer_id
      WHERE u.user_id = ${id} AND so.is_permanently_deleted = false
    `;

    if (officer.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Security officer not found'
      });
    }

    const currentOfficer = officer[0];

    // Verify it's actually a security officer
    if (currentOfficer.user_type !== 'security_officer') {
      return res.status(400).json({
        success: false,
        message: 'This user is not a security officer'
      });
    }

    // ============================================
    // UPDATE USER APPROVAL STATUS
    // ============================================

    const updatedUser = await sql`
      UPDATE users
      SET 
        is_approved = ${is_approved},
        status = ${is_approved ? 'active' : 'inactive'}::user_status_enum,
        updated_at = CURRENT_TIMESTAMP
      WHERE user_id = ${id}
      RETURNING 
        user_id,
        first_name,
        last_name,
        email,
        phone_number,
        user_type,
        status,
        is_approved,
        updated_at
    `;

    // ============================================
    // UPDATE SECURITY OFFICER TABLE
    // ============================================

    // Update employee_id if provided during approval
    const newEmployeeId = employee_id || currentOfficer.employee_id;

    await sql`
      UPDATE security_officers
      SET 
        approved_by_admin_id = ${req.user?.user_id || null},
        employee_id = ${newEmployeeId},
        updated_at = CURRENT_TIMESTAMP
      WHERE officer_id = ${id}
    `;

    // ============================================
    // SEND NOTIFICATION TO OFFICER
    // ============================================

    const notificationMessage = is_approved 
      ? `Your security officer account has been approved! Your employee ID is: ${newEmployeeId}. You can now start your duties.`
      : `Your security officer application has been rejected. ${approval_notes || 'Please contact the administrator for more information.'}`;

    await sql`
      INSERT INTO notifications (
        user_id,
        notification_type,
        subject,
        message,
        related_entity_type,
        related_entity_id,
        created_at
      ) VALUES (
        ${id},
        'email',
        ${is_approved ? 'Security Officer Approved' : 'Application Rejected'},
        ${notificationMessage},
        'security_officer',
        ${id},
        CURRENT_TIMESTAMP
      )
    `;

    // ============================================
    // NOTIFY ALL ACTIVE MEMBERS (if approved)
    // ============================================

    if (is_approved) {
      await sql`
        INSERT INTO notifications (
          user_id,
          notification_type,
          subject,
          message,
          related_entity_type,
          related_entity_id,
          created_at
        )
        SELECT 
          nm.member_id,
          'email',
          'New Security Officer',
          ${`A new security officer ${currentOfficer.first_name} ${currentOfficer.last_name} (ID: ${newEmployeeId}) has been approved and is now on duty.`},
          'security_officer',
          ${id},
          CURRENT_TIMESTAMP
        FROM neighborhood_members nm
        JOIN users u ON nm.member_id = u.user_id
        WHERE u.status = 'active' AND u.is_approved = true
      `;

      console.log(`✅ Sent notifications to all active members about new officer`);
    }

    // ============================================
    // LOG THE ACTION
    // ============================================

    await sql`
      INSERT INTO audit_logs (
        user_id,
        action_type,
        entity_type,
        entity_id,
        old_value,
        new_value,
        created_at
      ) VALUES (
        ${req.user?.user_id || null},
        ${is_approved ? 'APPROVE_OFFICER' : 'REJECT_OFFICER'},
        'security_officer',
        ${id},
        ${JSON.stringify({ 
          is_approved: currentOfficer.is_approved, 
          status: currentOfficer.status,
          employee_id: currentOfficer.employee_id
        })},
        ${JSON.stringify({ 
          is_approved, 
          status: is_approved ? 'active' : 'inactive',
          employee_id: newEmployeeId,
          approval_notes 
        })},
        CURRENT_TIMESTAMP
      )
    `;

    // ============================================
    // SUCCESS RESPONSE
    // ============================================

    console.log(`✅ Security officer ${is_approved ? 'approved' : 'rejected'}: ${id}`);

    return res.status(200).json({
      success: true,
      message: `Security officer ${is_approved ? 'approved' : 'rejected'} successfully`,
      data: {
        ...updatedUser[0],
        employee_id: newEmployeeId
      }
    });

  } catch (error) {
    console.error('❌ Error approving security officer:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to approve security officer',
      error: error.message
    });
  }
};

export default { approveUser, approveOfficer };