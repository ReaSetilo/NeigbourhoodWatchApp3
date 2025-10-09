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