import { supabase } from "../config/db.js";
import bcrypt from "bcrypt";
import crypto from "crypto";
import nodemailer from "nodemailer";

/** OFFICER ROUTES */

//get all officers
export const getAllOfficers = async (req, res) => {
   try {
        const { data: officers, error } = await supabase
            .from('security_officers')
            .select(`
                officer_id,
                employee_id,
                suspension_start_date,
                suspension_end_date,
                suspension_reason,
                is_permanently_deleted,
                created_at,
                updated_at,
                users!inner (
                    email,
                    phone_number,
                    first_name,
                    last_name,
                    status,
                    is_approved,
                    last_login
                )
            `)
            .eq('is_permanently_deleted', false)
            .order('created_at', { ascending: false });

        if (error) throw error;

        // Flatten the nested users object
        const flattenedOfficers = officers.map(officer => ({
            officer_id: officer.officer_id,
            employee_id: officer.employee_id,
            suspension_start_date: officer.suspension_start_date,
            suspension_end_date: officer.suspension_end_date,
            suspension_reason: officer.suspension_reason,
            is_permanently_deleted: officer.is_permanently_deleted,
            created_at: officer.created_at,
            updated_at: officer.updated_at,
            email: officer.users.email,
            phone_number: officer.users.phone_number,
            first_name: officer.users.first_name,
            last_name: officer.users.last_name,
            status: officer.users.status,
            is_approved: officer.users.is_approved,
            last_login: officer.users.last_login
        }));

        console.log("officers fetched");
        res.status(200).json({ success: true, data: flattenedOfficers });
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
        const { data: officer, error: officerError } = await supabase
            .from('security_officers')
            .select(`
                officer_id,
                users!inner (
                    first_name,
                    last_name
                )
            `)
            .eq('officer_id', id)
            .eq('is_permanently_deleted', false)
            .single();

        if (officerError || !officer) {
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
            const { error: updateOfficerError } = await supabase
                .from('security_officers')
                .update({
                    suspension_start_date: suspension_start.toISOString(),
                    suspension_end_date: suspension_end.toISOString(),
                    suspension_reason: suspension_reason
                })
                .eq('officer_id', id);

            if (updateOfficerError) throw updateOfficerError;

            // Update user status
            const { error: updateUserError } = await supabase
                .from('users')
                .update({ status: 'suspended' })
                .eq('user_id', id);

            if (updateUserError) throw updateUserError;

            // Get all active members for notifications
            const { data: activeMembers, error: membersError } = await supabase
                .from('neighborhood_members')
                .select('member_id')
                .eq('subscription_status', 'active');

            if (!membersError && activeMembers) {
                // Send notifications to all active members
                const notifications = activeMembers.map(member => ({
                    user_id: member.member_id,
                    notification_type: 'email',
                    subject: 'Security Officer Suspended',
                    message: `Security officer ${officer.users.first_name} ${officer.users.last_name} has been suspended. Reason: ${suspension_reason}`,
                    related_entity_type: 'security_officer',
                    related_entity_id: id
                }));

                await supabase.from('notifications').insert(notifications);
            }

            // Log the action
            await supabase.from('audit_logs').insert({
                user_id: req.user?.user_id || null,
                action_type: 'SUSPEND_OFFICER',
                entity_type: 'security_officer',
                entity_id: id,
                new_value: JSON.stringify({ suspension_reason, suspension_start, suspension_end })
            });

            console.log(`Officer ${id} suspended`);
            res.status(200).json({ 
                success: true, 
                message: "Officer suspended successfully",
                data: { suspension_start, suspension_end }
            });

        } else if (action === 'activate') {
            // Clear suspension
            const { error: clearSuspensionError } = await supabase
                .from('security_officers')
                .update({
                    suspension_start_date: null,
                    suspension_end_date: null,
                    suspension_reason: null
                })
                .eq('officer_id', id);

            if (clearSuspensionError) throw clearSuspensionError;

            // Update user status
            const { error: activateUserError } = await supabase
                .from('users')
                .update({ status: 'active' })
                .eq('user_id', id);

            if (activateUserError) throw activateUserError;

            // Get all active members for notifications
            const { data: activeMembers, error: membersError } = await supabase
                .from('neighborhood_members')
                .select('member_id')
                .eq('subscription_status', 'active');

            if (!membersError && activeMembers) {
                // Send notifications to members
                const notifications = activeMembers.map(member => ({
                    user_id: member.member_id,
                    notification_type: 'email',
                    subject: 'Security Officer Reactivated',
                    message: `Security officer ${officer.users.first_name} ${officer.users.last_name} has been reactivated and is back on duty.`,
                    related_entity_type: 'security_officer',
                    related_entity_id: id
                }));

                await supabase.from('notifications').insert(notifications);
            }

            // Log the action
            await supabase.from('audit_logs').insert({
                user_id: req.user?.user_id || null,
                action_type: 'ACTIVATE_OFFICER',
                entity_type: 'security_officer',
                entity_id: id
            });

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

        const { data: officer, error: officerError } = await supabase
            .from('security_officers')
            .select(`
                officer_id,
                employee_id,
                suspension_start_date,
                suspension_end_date,
                suspension_reason,
                is_permanently_deleted,
                approved_by_admin_id,
                created_at,
                updated_at,
                users!inner (
                    email,
                    phone_number,
                    first_name,
                    last_name,
                    status,
                    is_approved,
                    last_login,
                    created_at
                )
            `)
            .eq('officer_id', id)
            .eq('is_permanently_deleted', false)
            .single();

        if (officerError || !officer) {
            return res.status(404).json({ 
                success: false, 
                message: "Officer not found" 
            });
        }

        // Get patrol statistics
        const { data: patrolStats, error: statsError } = await supabase
            .rpc('get_patrol_stats', { officer_id_param: id });

        // If RPC doesn't exist, use regular queries
        let stats = { total_scans: 0, unique_locations: 0, last_patrol: null, first_patrol: null };
        if (!statsError && patrolStats) {
            stats = patrolStats;
        } else {
            const { count } = await supabase
                .from('patrol_scans')
                .select('*', { count: 'exact', head: true })
                .eq('officer_id', id);
            stats.total_scans = count || 0;
        }

        // Get recent patrols (last 10)
        const { data: recentPatrols } = await supabase
            .from('patrol_scans')
            .select(`
                scan_id,
                scan_timestamp,
                comments,
                qr_codes!inner (
                    gate_name,
                    location_description
                )
            `)
            .eq('officer_id', id)
            .order('scan_timestamp', { ascending: false })
            .limit(10);

        // Get anomalies for this officer
        const { data: anomalies } = await supabase
            .from('patrol_anomalies')
            .select('anomaly_id, anomaly_type, detection_date, status, notes')
            .eq('officer_id', id)
            .order('detection_date', { ascending: false })
            .limit(5);

        // Flatten the officer data
        const flattenedOfficer = {
            officer_id: officer.officer_id,
            employee_id: officer.employee_id,
            suspension_start_date: officer.suspension_start_date,
            suspension_end_date: officer.suspension_end_date,
            suspension_reason: officer.suspension_reason,
            is_permanently_deleted: officer.is_permanently_deleted,
            approved_by_admin_id: officer.approved_by_admin_id,
            created_at: officer.created_at,
            updated_at: officer.updated_at,
            email: officer.users.email,
            phone_number: officer.users.phone_number,
            first_name: officer.users.first_name,
            last_name: officer.users.last_name,
            status: officer.users.status,
            is_approved: officer.users.is_approved,
            last_login: officer.users.last_login,
            user_created_at: officer.users.created_at
        };

        res.status(200).json({ 
            success: true, 
            data: {
                ...flattenedOfficer,
                patrol_stats: stats,
                recent_patrols: recentPatrols || [],
                anomalies: anomalies || []
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
        const { data: officer, error: findError } = await supabase
            .from('security_officers')
            .select(`
                officer_id,
                users!inner (
                    first_name,
                    last_name
                )
            `)
            .eq('officer_id', id)
            .eq('is_permanently_deleted', false)
            .single();

        if (findError || !officer) {
            return res.status(404).json({ 
                success: false, 
                message: "Officer not found" 
            });
        }

        // Soft delete the officer
        const { error: deleteOfficerError } = await supabase
            .from('security_officers')
            .update({ is_permanently_deleted: true })
            .eq('officer_id', id);

        if (deleteOfficerError) throw deleteOfficerError;

        const { error: deleteUserError } = await supabase
            .from('users')
            .update({ status: 'deleted' })
            .eq('user_id', id);

        if (deleteUserError) throw deleteUserError;

        // Get all active members
        const { data: activeMembers } = await supabase
            .from('neighborhood_members')
            .select('member_id')
            .eq('subscription_status', 'active');

        if (activeMembers) {
            // Notify members
            const notifications = activeMembers.map(member => ({
                user_id: member.member_id,
                notification_type: 'email',
                subject: 'Security Officer Removed',
                message: `Security officer ${officer.users.first_name} ${officer.users.last_name} has been permanently removed from the system.`,
                related_entity_type: 'security_officer',
                related_entity_id: id
            }));

            await supabase.from('notifications').insert(notifications);
        }

        // Create audit log
        await supabase.from('audit_logs').insert({
            user_id: req.user?.user_id || null,
            action_type: 'DELETE_OFFICER',
            entity_type: 'security_officer',
            entity_id: id,
            ip_address: req.ip || null
        });

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
        const { data: houses, error } = await supabase
            .from('houses')
            .select(`
                house_id,
                house_number,
                street_address,
                status,
                created_at,
                updated_at,
                qr_codes (
                    qr_code_value,
                    gate_name,
                    is_active
                ),
                neighborhood_members (
                    member_id,
                    subscription_status,
                    users!inner (
                        first_name,
                        last_name,
                        email,
                        phone_number
                    ),
                    subscriptions (
                        missed_payments_count
                    )
                )
            `)
            .neq('status', 'deleted')
            .order('created_at', { ascending: false });

        if (error) throw error;

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
        const { data: house, error: findError } = await supabase
            .from('houses')
            .select(`
                house_id,
                house_number,
                street_address,
                member_id,
                neighborhood_members (
                    users!inner (
                        first_name,
                        last_name,
                        email
                    )
                )
            `)
            .eq('house_id', id)
            .neq('status', 'deleted')
            .single();

        if (findError || !house) {
            return res.status(404).json({ 
                success: false, 
                message: "House not found" 
            });
        }

        // Update house status to suspended
        const { error: updateHouseError } = await supabase
            .from('houses')
            .update({ status: 'suspended' })
            .eq('house_id', id);

        if (updateHouseError) throw updateHouseError;

        // If there's a member, update their subscription status
        if (house.member_id) {
            await supabase
                .from('neighborhood_members')
                .update({ subscription_status: 'suspended' })
                .eq('member_id', house.member_id);

            await supabase
                .from('subscriptions')
                .update({ status: 'suspended' })
                .eq('member_id', house.member_id)
                .eq('status', 'active');

            // Send notification to the member
            await supabase.from('notifications').insert({
                user_id: house.member_id,
                notification_type: 'email',
                subject: 'House Removed from Monitoring',
                message: reason || `Your house at ${house.house_number} ${house.street_address} has been removed from security monitoring due to missed payments. Please contact administration.`,
                related_entity_type: 'house',
                related_entity_id: id
            });
        }

        // Get all active security officers
        const { data: officers } = await supabase
            .from('security_officers')
            .select('officer_id')
            .eq('is_permanently_deleted', false);

        if (officers) {
            // Notify security officers
            const notifications = officers.map(officer => ({
                user_id: officer.officer_id,
                notification_type: 'push',
                subject: 'House Removed from Patrol',
                message: `House at ${house.house_number} ${house.street_address} has been removed from patrol monitoring.`,
                related_entity_type: 'house',
                related_entity_id: id
            }));

            await supabase.from('notifications').insert(notifications);
        }

        // Create audit log
        await supabase.from('audit_logs').insert({
            user_id: req.user?.user_id || null,
            action_type: 'REMOVE_HOUSE',
            entity_type: 'house',
            entity_id: id,
            old_value: JSON.stringify({ status: 'active' }),
            new_value: JSON.stringify({ status: 'suspended', reason })
        });

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

        const { data: house, error } = await supabase
            .from('houses')
            .select(`
                house_id,
                house_number,
                street_address,
                status,
                created_at,
                updated_at,
                qr_code_id,
                qr_codes (
                    qr_code_value,
                    gate_name,
                    location_description,
                    is_active
                ),
                member_id,
                neighborhood_members (
                    subscription_status,
                    subscription_start_date,
                    last_payment_date,
                    users!inner (
                        first_name,
                        last_name,
                        email,
                        phone_number
                    ),
                    subscriptions (
                        monthly_fee,
                        missed_payments_count,
                        status
                    )
                )
            `)
            .eq('house_id', id)
            .single();

        if (error || !house) {
            return res.status(404).json({ 
                success: false, 
                message: "House not found" 
            });
        }

        // Get patrol history for this house (if QR code exists)
        let patrolHistory = [];
        if (house.qr_code_id) {
            const { data: patrols } = await supabase
                .from('patrol_scans')
                .select(`
                    scan_id,
                    scan_timestamp,
                    comments,
                    security_officers!inner (
                        employee_id,
                        users!inner (
                            first_name,
                            last_name
                        )
                    )
                `)
                .eq('qr_code_id', house.qr_code_id)
                .order('scan_timestamp', { ascending: false })
                .limit(20);

            patrolHistory = patrols || [];
        }

        // Get payment history if member exists
        let paymentHistory = [];
        if (house.member_id) {
            const { data: payments } = await supabase
                .from('payments')
                .select('payment_id, amount, payment_method, payment_status, payment_date, month_paid_for')
                .eq('member_id', house.member_id)
                .order('payment_date', { ascending: false })
                .limit(12);

            paymentHistory = payments || [];
        }

        console.log("house fetched");
        res.status(200).json({ 
            success: true, 
            data: {
                ...house,
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
        const { data: house, error: findError } = await supabase
            .from('houses')
            .select(`
                house_id,
                house_number,
                street_address,
                status,
                member_id,
                neighborhood_members (
                    users!inner (
                        first_name,
                        last_name,
                        email
                    )
                )
            `)
            .eq('house_id', id)
            .single();

        if (findError || !house) {
            return res.status(404).json({ 
                success: false, 
                message: "House not found" 
            });
        }

        // Check if house is already active
        if (house.status === 'active') {
            return res.status(400).json({ 
                success: false, 
                message: "House is already active in monitoring" 
            });
        }

        // Reactivate the house
        const { error: updateHouseError } = await supabase
            .from('houses')
            .update({ status: 'active' })
            .eq('house_id', id);

        if (updateHouseError) throw updateHouseError;

        // If there's a member, reactivate their subscription
        if (house.member_id) {
            await supabase
                .from('neighborhood_members')
                .update({ subscription_status: 'active' })
                .eq('member_id', house.member_id);

            await supabase
                .from('subscriptions')
                .update({
                    status: 'active',
                    missed_payments_count: 0
                })
                .eq('member_id', house.member_id)
                .eq('status', 'suspended');

            // Send notification to the member
            await supabase.from('notifications').insert({
                user_id: house.member_id,
                notification_type: 'email',
                subject: 'House Reinstated for Monitoring',
                message: `Good news! Your house at ${house.house_number} ${house.street_address} has been reinstated for security monitoring. Patrols will resume immediately.`,
                related_entity_type: 'house',
                related_entity_id: id
            });
        }

        // Get all active officers
        const { data: officers } = await supabase
            .from('security_officers')
            .select('officer_id')
            .eq('is_permanently_deleted', false);

        if (officers) {
            // Notify security officers
            const notifications = officers.map(officer => ({
                user_id: officer.officer_id,
                notification_type: 'push',
                subject: 'House Added Back to Patrol',
                message: `House at ${house.house_number} ${house.street_address} has been reinstated for patrol monitoring.`,
                related_entity_type: 'house',
                related_entity_id: id
            }));

            await supabase.from('notifications').insert(notifications);
        }

        // Create audit log
        await supabase.from('audit_logs').insert({
            user_id: req.user?.user_id || null,
            action_type: 'REINSTATE_HOUSE',
            entity_type: 'house',
            entity_id: id,
            old_value: JSON.stringify({ status: house.status }),
            new_value: JSON.stringify({ status: 'active' })
        });

        console.log(`House ${id} reinstated for monitoring`);
        res.status(200).json({ 
            success: true, 
            message: "House reinstated for monitoring successfully"
        });
    } catch (error) {
        console.error("Error reinstating house:", error);
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
        const { data: existingUser } = await supabase
            .from('users')
            .select('user_id')
            .eq('email', email)
            .single();

        if (existingUser) {
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
        const { data: newUser, error: userError } = await supabase
            .from('users')
            .insert({
                email, 
                password_hash, 
                phone_number, 
                first_name, 
                last_name, 
                user_type: 'admin', 
                status: 'active',
                is_approved: true
            })
            .select()
            .single();

        if (userError) throw userError;

        // Insert into administrators table
        const { data: newAdmin, error: adminError } = await supabase
            .from('administrators')
            .insert({
                admin_id: newUser.user_id, 
                created_by_admin_id,
                can_modify_system_config: can_modify_system_config || false
            })
            .select()
            .single();

        if (adminError) throw adminError;

        // Create audit log
        await supabase.from('audit_logs').insert({
            user_id: created_by_admin_id,
            action_type: 'CREATE_ADMIN',
            entity_type: 'administrator',
            entity_id: newUser.user_id,
            new_value: JSON.stringify({ 
                email, 
                can_modify_system_config: can_modify_system_config || false 
            })
        });

        console.log("Admin added successfully");
        res.status(201).json({ 
            success: true, 
            message: "Admin account created successfully",
            data: {
                ...newUser,
                can_modify_system_config: newAdmin.can_modify_system_config
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
        const { data: admin, error: findError } = await supabase
            .from('administrators')
            .select(`
                admin_id,
                can_modify_system_config,
                users!inner (
                    first_name,
                    last_name,
                    email
                )
            `)
            .eq('admin_id', id)
            .single();

        if (findError || !admin) {
            return res.status(404).json({ 
                success: false, 
                message: "Admin not found" 
            });
        }

        // Check if the requesting admin has permission to delete admins with system config privileges
        if (admin.can_modify_system_config) {
            const { data: requestingAdmin } = await supabase
                .from('administrators')
                .select('can_modify_system_config')
                .eq('admin_id', req.user?.user_id)
                .single();

            if (!requestingAdmin || !requestingAdmin.can_modify_system_config) {
                return res.status(403).json({ 
                    success: false, 
                    message: "You don't have permission to remove an admin with system configuration privileges" 
                });
            }
        }

        // Check if this admin has created other admins
        const { count } = await supabase
            .from('administrators')
            .select('*', { count: 'exact', head: true })
            .eq('created_by_admin_id', id);

        if (count > 0) {
            return res.status(400).json({ 
                success: false, 
                message: `Cannot delete admin. This admin has created ${count} other admin account(s). Please reassign or remove those accounts first.` 
            });
        }

        // Delete admin record
        const { error: deleteAdminError } = await supabase
            .from('administrators')
            .delete()
            .eq('admin_id', id);

        if (deleteAdminError) throw deleteAdminError;

        const { error: deleteUserError } = await supabase
            .from('users')
            .delete()
            .eq('user_id', id);

        if (deleteUserError) throw deleteUserError;

        // Create audit log
        await supabase.from('audit_logs').insert({
            user_id: req.user?.user_id || null,
            action_type: 'DELETE_ADMIN',
            entity_type: 'administrator',
            entity_id: id,
            old_value: JSON.stringify({ 
                email: admin.users.email,
                name: `${admin.users.first_name} ${admin.users.last_name}`,
                can_modify_system_config: admin.can_modify_system_config
            })
        });

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
        const { data: users, error } = await supabase
            .from('users')
            .select(`
                user_id,
                email,
                phone_number,
                first_name,
                last_name,
                user_type,
                status,
                is_approved,
                last_login,
                created_at,
                updated_at
            `)
            .neq('status', 'deleted')
            .order('created_at', { ascending: false });

        if (error) throw error;

        // Get role details for each user
        const usersWithDetails = await Promise.all(users.map(async (user) => {
            let role_details = null;

            if (user.user_type === 'admin') {
                const { data: admin } = await supabase
                    .from('administrators')
                    .select('can_modify_system_config, created_by_admin_id')
                    .eq('admin_id', user.user_id)
                    .single();
                role_details = admin;
            } else if (user.user_type === 'security_officer') {
                const { data: officer } = await supabase
                    .from('security_officers')
                    .select('employee_id, suspension_start_date, suspension_end_date, suspension_reason, is_permanently_deleted')
                    .eq('officer_id', user.user_id)
                    .single();
                role_details = officer;
            } else if (user.user_type === 'neighborhood_member') {
                const { data: member } = await supabase
                    .from('neighborhood_members')
                    .select('subscription_status, subscription_start_date, last_payment_date')
                    .eq('member_id', user.user_id)
                    .single();
                role_details = member;
            }

            return { ...user, role_details };
        }));

        console.log("All users fetched");
        res.status(200).json({ 
            success: true, 
            data: usersWithDetails,
            count: usersWithDetails.length
        });
    } catch (error) {
        console.error("Error fetching all users:", error);
        res.status(500).json({ success: false, message: "Internal server error" });
    }
};

export const getMembers = async (req, res) => {
  try {
    const { data: members, error } = await supabase
      .from('users')
      .select(`
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
      `)
      .eq('user_type', 'neighborhood_member')
      .order('created_at', { ascending: false });

    if (error) throw error;

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
    
    const { data: existingUser } = await supabase
      .from('users')
      .select('user_id, email')
      .eq('email', email)
      .single();

    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: 'Email already exists',
        existingUserId: existingUser.user_id
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
    
    const { data: newUser, error: userError } = await supabase
      .from('users')
      .insert({
        first_name,
        last_name,
        email,
        phone_number: phone_number || null,
        password_hash: hashedPassword,
        user_type,
        status,
        is_approved
      })
      .select()
      .single();

    if (userError) throw userError;

    const userId = newUser.user_id;

    // ============================================
    // CREATE RELATED RECORDS BASED ON USER TYPE
    // ============================================
    
    if (user_type === 'security_officer') {
      // Create security officer record
      const generatedEmployeeId = employee_id || `SO-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
      
      const { error: officerError } = await supabase
        .from('security_officers')
        .insert({
          officer_id: userId,
          employee_id: generatedEmployeeId,
          approved_by_admin_id: req.user?.user_id || null,
          is_permanently_deleted: false
        });

      if (officerError) throw officerError;

      console.log(`✅ Security officer created with employee_id: ${generatedEmployeeId}`);
    } 
    else if (user_type === 'neighborhood_member') {
      // Create neighborhood member record
      const { error: memberError } = await supabase
        .from('neighborhood_members')
        .insert({
          member_id: userId,
          house_number: house_number || null,
          street_address: street_address || null,
          subscription_status: subscription_status || 'active',
          subscription_start_date: subscription_start_date || null,
          approved_by_admin_id: req.user?.user_id || null
        });

      if (memberError) throw memberError;

      console.log(`✅ Neighborhood member created`);
    }
    else if (user_type === 'admin') {
      // Create administrator record
      const { error: adminError } = await supabase
        .from('administrators')
        .insert({
          admin_id: userId,
          created_by_admin_id: req.user?.user_id || null,
          can_modify_system_config
        });

      if (adminError) throw adminError;

      console.log(`✅ Administrator created with can_modify_system_config: ${can_modify_system_config}`);
    }

    // ============================================
    // SUCCESS RESPONSE
    // ============================================
    
    console.log(`✅ User created: ${userId} - ${user_type}`);
    
    return res.status(201).json({
      success: true,
      message: `${getUserTypeLabel(user_type)} created successfully`,
      data: newUser
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
    if (!id) {
      return res.status(400).json({
        success: false,
        message: 'Valid member ID is required'
      });
    }

    const { data: member, error } = await supabase
      .from('users')
      .select(`
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
      `)
      .eq('user_id', id)
      .eq('user_type', 'neighborhood_member')
      .single();

    if (error || !member) {
      return res.status(404).json({
        success: false,
        message: 'Member not found'
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Member retrieved successfully',
      data: member
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
    if (!id) {
      return res.status(400).json({
        success: false,
        message: 'Valid member ID is required'
      });
    }

    // Check if member exists
    const { data: existingMember, error: findError } = await supabase
      .from('users')
      .select('user_id')
      .eq('user_id', id)
      .eq('user_type', 'neighborhood_member')
      .single();

    if (findError || !existingMember) {
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

      const { data: duplicateEmail } = await supabase
        .from('users')
        .select('user_id')
        .eq('email', email)
        .neq('user_id', id)
        .single();

      if (duplicateEmail) {
        return res.status(409).json({
          success: false,
          message: 'Email already exists'
        });
      }
    }

    // Build update object
    const updates = {};
    if (first_name !== undefined) updates.first_name = first_name;
    if (last_name !== undefined) updates.last_name = last_name;
    if (email !== undefined) updates.email = email;
    if (phone_number !== undefined) updates.phone_number = phone_number;
    if (status !== undefined) updates.status = status;
    if (is_approved !== undefined) updates.is_approved = is_approved;

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No fields to update'
      });
    }

    updates.updated_at = new Date().toISOString();

    const { data: updatedMember, error: updateError } = await supabase
      .from('users')
      .update(updates)
      .eq('user_id', id)
      .eq('user_type', 'neighborhood_member')
      .select()
      .single();

    if (updateError) throw updateError;

    return res.status(200).json({
      success: true,
      message: 'Member updated successfully',
      data: updatedMember
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
    if (!id) {
      return res.status(400).json({
        success: false,
        message: 'Valid member ID is required'
      });
    }

    // Check if member exists
    const { data: existingMember, error: findError } = await supabase
      .from('users')
      .select('user_id')
      .eq('user_id', id)
      .eq('user_type', 'neighborhood_member')
      .single();

    if (findError || !existingMember) {
      return res.status(404).json({
        success: false,
        message: 'Member not found'
      });
    }

    // Soft delete - update status to 'deleted'
    const { error: deleteError } = await supabase
      .from('users')
      .update({ 
        status: 'deleted',
        updated_at: new Date().toISOString()
      })
      .eq('user_id', id)
      .eq('user_type', 'neighborhood_member');

    if (deleteError) throw deleteError;

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

    const { data: user, error: userError } = await supabase
      .from('users')
      .select('user_id, first_name, last_name, email, user_type, status, is_approved')
      .eq('user_id', id)
      .single();

    if (userError || !user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Check if user is a security officer (should use the officer-specific endpoint)
    if (user.user_type === 'security_officer') {
      return res.status(400).json({
        success: false,
        message: 'Please use the security officer approval endpoint for officers'
      });
    }

    // Check if already approved
    if (user.is_approved && user.status === 'active') {
      return res.status(400).json({
        success: false,
        message: 'User is already approved and active'
      });
    }

    // ============================================
    // UPDATE USER APPROVAL STATUS
    // ============================================

    const { data: updatedUser, error: updateError } = await supabase
      .from('users')
      .update({
        is_approved: true,
        status: 'active',
        updated_at: new Date().toISOString()
      })
      .eq('user_id', id)
      .select()
      .single();

    if (updateError) throw updateError;

    // ============================================
    // UPDATE RELATED TABLE (if neighborhood member)
    // ============================================

    if (user.user_type === 'neighborhood_member') {
      await supabase
        .from('neighborhood_members')
        .update({
          approved_by_admin_id: req.user?.user_id || null,
          updated_at: new Date().toISOString()
        })
        .eq('member_id', id);
    }

    // ============================================
    // SEND NOTIFICATION TO USER
    // ============================================

    const notificationMessage = `Your account has been approved! You can now access all features of the Neighborhood Watch system.`;

    await supabase.from('notifications').insert({
      user_id: id,
      notification_type: 'email',
      subject: 'Account Approved',
      message: notificationMessage,
      related_entity_type: 'user',
      related_entity_id: id
    });

    // ============================================
    // LOG THE ACTION
    // ============================================

    await supabase.from('audit_logs').insert({
      user_id: req.user?.user_id || null,
      action_type: 'APPROVE_USER',
      entity_type: 'user',
      entity_id: id,
      old_value: JSON.stringify({ is_approved: user.is_approved, status: user.status }),
      new_value: JSON.stringify({ is_approved: true, status: 'active', approval_notes: approval_notes || 'Approved by admin' })
    });

    // ============================================
    // SUCCESS RESPONSE
    // ============================================

    console.log(`✅ User approved: ${id}`);

    return res.status(200).json({
      success: true,
      message: 'User approved successfully',
      data: updatedUser
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

    const { data: user, error: userError } = await supabase
      .from('users')
      .select('user_id, first_name, last_name, email, user_type, status, is_approved')
      .eq('user_id', id)
      .single();

    if (userError || !user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Check if user is a security officer (should use the officer-specific endpoint)
    if (user.user_type === 'security_officer') {
      return res.status(400).json({
        success: false,
        message: 'Please use the security officer rejection endpoint for officers'
      });
    }

    // Check if already rejected
    if (!user.is_approved && user.status === 'inactive') {
      return res.status(400).json({
        success: false,
        message: 'User is already rejected and inactive'
      });
    }

    // ============================================
    // UPDATE USER APPROVAL STATUS
    // ============================================

    const { data: updatedUser, error: updateError } = await supabase
      .from('users')
      .update({
        is_approved: false,
        status: 'inactive',
        updated_at: new Date().toISOString()
      })
      .eq('user_id', id)
      .select()
      .single();

    if (updateError) throw updateError;

    // ============================================
    // UPDATE RELATED TABLE (if neighborhood member)
    // ============================================

    if (user.user_type === 'neighborhood_member') {
      await supabase
        .from('neighborhood_members')
        .update({
          approved_by_admin_id: req.user?.user_id || null,
          updated_at: new Date().toISOString()
        })
        .eq('member_id', id);
    }

    // ============================================
    // SEND NOTIFICATION TO USER
    // ============================================

    const notificationMessage = `Your account approval has been rejected. Reason: ${rejection_reason}. Please contact the administrator for more information.`;

    await supabase.from('notifications').insert({
      user_id: id,
      notification_type: 'email',
      subject: 'Account Approval Rejected',
      message: notificationMessage,
      delivery_status: 'pending',
      related_entity_type: 'user',
      related_entity_id: id
    });

    // ============================================
    // LOG THE ACTION
    // ============================================

    await supabase.from('audit_logs').insert({
      user_id: req.user?.user_id || null,
      action_type: 'REJECT_USER',
      entity_type: 'user',
      entity_id: id,
      old_value: JSON.stringify({ 
        is_approved: user.is_approved, 
        status: user.status 
      }),
      new_value: JSON.stringify({ 
        is_approved: false, 
        status: 'inactive', 
        rejection_reason 
      })
    });

    // ============================================
    // SUCCESS RESPONSE
    // ============================================

    console.log(`✅ User rejected: ${id} - Reason: ${rejection_reason}`);

    return res.status(200).json({
      success: true,
      message: 'User rejected successfully',
      data: updatedUser
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

    const { data: officer, error: officerError } = await supabase
      .from('security_officers')
      .select(`
        officer_id,
        employee_id,
        is_permanently_deleted,
        users!inner (
          user_type,
          status,
          is_approved,
          first_name,
          last_name,
          email
        )
      `)
      .eq('officer_id', id)
      .eq('is_permanently_deleted', false)
      .single();

    if (officerError || !officer) {
      return res.status(404).json({
        success: false,
        message: 'Security officer not found'
      });
    }

    // Verify it's actually a security officer
    if (officer.users.user_type !== 'security_officer') {
      return res.status(400).json({
        success: false,
        message: 'This user is not a security officer'
      });
    }

    // ============================================
    // UPDATE USER APPROVAL STATUS
    // ============================================

    const { data: updatedUser, error: updateUserError } = await supabase
      .from('users')
      .update({
        is_approved,
        status: is_approved ? 'active' : 'inactive',
        updated_at: new Date().toISOString()
      })
      .eq('user_id', id)
      .select()
      .single();

    if (updateUserError) throw updateUserError;

    // ============================================
    // UPDATE SECURITY OFFICER TABLE
    // ============================================

    // Update employee_id if provided during approval
    const newEmployeeId = employee_id || officer.employee_id;

    const { error: updateOfficerError } = await supabase
      .from('security_officers')
      .update({
        approved_by_admin_id: req.user?.user_id || null,
        employee_id: newEmployeeId,
        updated_at: new Date().toISOString()
      })
      .eq('officer_id', id);

    if (updateOfficerError) throw updateOfficerError;

    // ============================================
    // SEND NOTIFICATION TO OFFICER
    // ============================================

    const notificationMessage = is_approved 
      ? `Your security officer account has been approved! Your employee ID is: ${newEmployeeId}. You can now start your duties.`
      : `Your security officer application has been rejected. ${approval_notes || 'Please contact the administrator for more information.'}`;

    await supabase.from('notifications').insert({
      user_id: id,
      notification_type: 'email',
      subject: is_approved ? 'Security Officer Approved' : 'Application Rejected',
      message: notificationMessage,
      related_entity_type: 'security_officer',
      related_entity_id: id
    });

    // ============================================
    // NOTIFY ALL ACTIVE MEMBERS (if approved)
    // ============================================

    if (is_approved) {
      const { data: activeMembers } = await supabase
        .from('neighborhood_members')
        .select('member_id')
        .eq('subscription_status', 'active');

      if (activeMembers && activeMembers.length > 0) {
        const notifications = activeMembers.map(member => ({
          user_id: member.member_id,
          notification_type: 'email',
          subject: 'New Security Officer',
          message: `A new security officer ${officer.users.first_name} ${officer.users.last_name} (ID: ${newEmployeeId}) has been approved and is now on duty.`,
          related_entity_type: 'security_officer',
          related_entity_id: id
        }));

        await supabase.from('notifications').insert(notifications);
        console.log(`✅ Sent notifications to all active members about new officer`);
      }
    }

    // ============================================
    // LOG THE ACTION
    // ============================================

    await supabase.from('audit_logs').insert({
      user_id: req.user?.user_id || null,
      action_type: is_approved ? 'APPROVE_OFFICER' : 'REJECT_OFFICER',
      entity_type: 'security_officer',
      entity_id: id,
      old_value: JSON.stringify({ 
        is_approved: officer.users.is_approved, 
        status: officer.users.status,
        employee_id: officer.employee_id
      }),
      new_value: JSON.stringify({ 
        is_approved, 
        status: is_approved ? 'active' : 'inactive',
        employee_id: newEmployeeId,
        approval_notes 
      })
    });

    // ============================================
    // SUCCESS RESPONSE
    // ============================================

    console.log(`✅ Security officer ${is_approved ? 'approved' : 'rejected'}: ${id}`);

    return res.status(200).json({
      success: true,
      message: `Security officer ${is_approved ? 'approved' : 'rejected'} successfully`,
      data: {
        ...updatedUser,
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

/**
 * Send OTP to admin's email
 * @route POST /api/auth/admin/send-otp
 */
export const sendAdminOtp = async (req, res) => {
  try {
    const { email } = req.body;

    // ============================================
    // VALIDATION
    // ============================================

    if (!email || !email.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Email is required'
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

    // ============================================
    // CHECK IF ADMIN EXISTS
    // ============================================

    const { data: admin, error: adminError } = await supabase
      .from('administrators')
      .select(`
        admin_id,
        can_modify_system_config,
        users!inner (
          email,
          first_name,
          last_name,
          user_type,
          status,
          is_approved
        )
      `)
      .ilike('users.email', email)
      .eq('users.user_type', 'admin')
      .single();

    if (adminError || !admin) {
      return res.status(404).json({
        success: false,
        message: 'No administrator account found with this email'
      });
    }

    // Check if admin account is active
    if (admin.users.status === 'inactive' || admin.users.status === 'deleted') {
      return res.status(403).json({
        success: false,
        message: 'Your administrator account has been deactivated. Please contact support.'
      });
    }

    // Check if admin is approved
    if (!admin.users.is_approved) {
      return res.status(403).json({
        success: false,
        message: 'Your administrator account is pending approval.'
      });
    }

    // ============================================
    // GENERATE OTP
    // ============================================

    // Generate 6-digit OTP
    const otp = crypto.randomInt(100000, 999999).toString();
    
    // OTP expires in 10 minutes
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    // ============================================
    // STORE OTP IN DATABASE
    // ============================================

    // Delete any existing unused OTPs for this admin
    await supabase
      .from('otp_tokens')
      .delete()
      .eq('user_id', admin.admin_id)
      .is('used_at', null);

    // Insert new OTP
    const { error: otpError } = await supabase
      .from('otp_tokens')
      .insert({
        user_id: admin.admin_id,
        otp_code: otp,
        expires_at: expiresAt.toISOString()
      });

    if (otpError) throw otpError;

    // ============================================
    // SEND EMAIL WITH OTP
    // ============================================

    try {
      // Configure nodemailer transporter
      const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST || 'smtp.gmail.com',
        port: parseInt(process.env.SMTP_PORT || '587'),
        secure: false,
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS,
        },
      });

      // Email template for admin
      const mailOptions = {
        from: `"Neighborhood Watch Admin" <${process.env.SMTP_USER}>`,
        to: email,
        subject: '🔐 Admin Portal - Your Verification Code',
        html: `
          <!DOCTYPE html>
          <html>
            <head>
              <meta charset="utf-8">
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
              <title>Admin Verification Code</title>
            </head>
            <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f5f5f5;">
              <div style="max-width: 600px; margin: 40px auto; background-color: white; border-radius: 12px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
                <!-- Header -->
                <div style="background: linear-gradient(135deg, #dc2626 0%, #991b1b 100%); padding: 40px 20px; text-align: center;">
                  <h1 style="color: white; margin: 0; font-size: 28px;">🔐 Administrator Access</h1>
                </div>
                
                <!-- Body -->
                <div style="padding: 40px 30px;">
                  <p style="color: #333; font-size: 16px; line-height: 1.6; margin-bottom: 20px;">
                    Hello <strong>${admin.users.first_name || 'Administrator'}</strong>,
                  </p>
                  
                  <p style="color: #666; font-size: 16px; line-height: 1.6; margin-bottom: 30px;">
                    Your verification code for signing in to the <strong>Admin Portal</strong> is:
                  </p>
                  
                  <!-- OTP Code -->
                  <div style="background-color: #fef2f2; border: 2px dashed #dc2626; border-radius: 8px; padding: 30px; text-align: center; margin-bottom: 30px;">
                    <div style="font-size: 36px; font-weight: bold; color: #dc2626; letter-spacing: 8px;">
                      ${otp}
                    </div>
                  </div>
                  
                  <div style="background-color: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin-bottom: 20px; border-radius: 4px;">
                    <p style="color: #856404; font-size: 14px; margin: 0; line-height: 1.6;">
                      <strong>⚠️ Security Notice:</strong> This code grants access to the administrator portal. Never share this code with anyone.
                    </p>
                  </div>
                  
                  <p style="color: #666; font-size: 14px; line-height: 1.6; margin-bottom: 20px;">
                    This code will expire in <strong>10 minutes</strong>.
                  </p>
                  
                  <p style="color: #666; font-size: 14px; line-height: 1.6;">
                    If you didn't request this code, please contact the system administrator immediately.
                  </p>
                </div>
                
                <!-- Footer -->
                <div style="background-color: #f8f9fa; padding: 20px 30px; border-top: 1px solid #e9ecef;">
                  <p style="color: #999; font-size: 12px; margin: 0; text-align: center;">
                    © ${new Date().getFullYear()} Neighborhood Watch Admin Portal. All rights reserved.
                  </p>
                  <p style="color: #999; font-size: 11px; margin: 10px 0 0 0; text-align: center;">
                    This is an automated security message. Do not reply to this email.
                  </p>
                </div>
              </div>
            </body>
          </html>
        `,
        text: `Admin Portal Access\n\nYour verification code is: ${otp}\n\nThis code will expire in 10 minutes.\n\nIf you didn't request this code, please contact the system administrator immediately.`,
      };

      await transporter.sendMail(mailOptions);

      console.log(`✅ Admin OTP sent to ${email}`);

      return res.status(200).json({
        success: true,
        message: 'Verification code sent to your email'
      });

    } catch (emailError) {
      console.error('❌ Error sending email:', emailError);
      
      return res.status(500).json({
        success: false,
        message: 'Failed to send verification code. Please try again.'
      });
    }

  } catch (error) {
    console.error('❌ Error in sendAdminOtp:', error);
    return res.status(500).json({
      success: false,
      message: 'An error occurred. Please try again.',
      error: error.message
    });
  }
};

/**
 * Verify admin OTP and sign in
 * @route POST /api/auth/admin/verify-otp
 */
export const verifyAdminOtp = async (req, res) => {
  try {
    const { email, otp } = req.body;

    // ============================================
    // VALIDATION
    // ============================================

    if (!email || !email.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Email is required'
      });
    }

    if (!otp || otp.length !== 6) {
      return res.status(400).json({
        success: false,
        message: 'Invalid OTP format. Please enter 6 digits.'
      });
    }

    // ============================================
    // GET ADMIN BY EMAIL
    // ============================================

    const { data: admin, error: adminError } = await supabase
      .from('administrators')
      .select(`
        admin_id,
        can_modify_system_config,
        users!inner (
          user_id,
          email,
          first_name,
          last_name,
          user_type,
          status,
          is_approved
        )
      `)
      .ilike('users.email', email)
      .eq('users.user_type', 'admin')
      .single();

    if (adminError || !admin) {
      return res.status(404).json({
        success: false,
        message: 'Administrator not found'
      });
    }

    // ============================================
    // VERIFY OTP
    // ============================================

    const { data: otpRecord, error: otpError } = await supabase
      .from('otp_tokens')
      .select('otp_id, user_id, otp_code, expires_at, used_at, created_at')
      .eq('user_id', admin.admin_id)
      .eq('otp_code', otp)
      .gt('expires_at', new Date().toISOString())
      .is('used_at', null)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (otpError || !otpRecord) {
      // Log failed attempt
      await supabase.from('audit_logs').insert({
        user_id: admin.admin_id,
        action_type: 'FAILED_LOGIN_ATTEMPT',
        entity_type: 'user',
        entity_id: admin.admin_id,
        ip_address: req.ip || req.connection?.remoteAddress || null
      });

      return res.status(401).json({
        success: false,
        message: 'Invalid or expired verification code'
      });
    }

    // ============================================
    // MARK OTP AS USED
    // ============================================

    await supabase
      .from('otp_tokens')
      .update({ used_at: new Date().toISOString() })
      .eq('otp_id', otpRecord.otp_id);

    // ============================================
    // UPDATE LAST LOGIN
    // ============================================

    await supabase
      .from('users')
      .update({ last_login: new Date().toISOString() })
      .eq('user_id', admin.admin_id);

    // ============================================
    // CREATE ADMIN SESSION TOKEN
    // ============================================

    // Generate secure session token
    const sessionToken = crypto.randomBytes(32).toString('hex');
    const tokenExpiry = new Date(Date.now() + 12 * 60 * 60 * 1000); // 12 hours for admin

    // Store session in database (if you have user_sessions table)
    try {
      await supabase.from('user_sessions').insert({
        user_id: admin.admin_id,
        session_token: sessionToken,
        expires_at: tokenExpiry.toISOString()
      });
    } catch (sessionError) {
      console.log('Note: user_sessions table may not exist, skipping session storage');
    }

    // ============================================
    // LOG SUCCESSFUL LOGIN
    // ============================================

    await supabase.from('audit_logs').insert({
      user_id: admin.admin_id,
      action_type: 'ADMIN_LOGIN',
      entity_type: 'user',
      entity_id: admin.admin_id,
      ip_address: req.ip || req.connection?.remoteAddress || null
    });

    console.log(`✅ Admin logged in: ${email}`);

    // ============================================
    // SUCCESS RESPONSE
    // ============================================

    return res.status(200).json({
      success: true,
      message: 'Login successful',
      token: sessionToken,
      admin: {
        id: admin.users.user_id,
        adminId: admin.admin_id,
        email: admin.users.email,
        firstName: admin.users.first_name,
        lastName: admin.users.last_name,
        userType: admin.users.user_type,
        status: admin.users.status,
        isApproved: admin.users.is_approved,
        canModifySystemConfig: admin.can_modify_system_config
      }
    });

  } catch (error) {
    console.error('❌ Error in verifyAdminOtp:', error);
    return res.status(500).json({
      success: false,
      message: 'An error occurred. Please try again.',
      error: error.message
    });
  }
};

/**
 * Get patrol statistics
 * @route GET /api/admin/patrol-stats
 * @query {string} officer_id - Optional: Filter by specific officer
 * @query {string} start_date - Optional: Filter from date (ISO format)
 * @query {string} end_date - Optional: Filter to date (ISO format)
 * @query {string} period - Optional: 'day', 'week', 'month', 'year', 'all' (default: 'month')
 */
export const getPatrolStatistics = async (req, res) => {
  try {
    const { officer_id, start_date, end_date, period = 'all' } = req.query;

    // ============================================
    // CALCULATE DATE RANGE BASED ON PERIOD
    // ============================================
    
    let dateFilter = {};
    const now = new Date();
    
    if (start_date && end_date) {
      // Custom date range
      dateFilter.start = new Date(start_date).toISOString();
      dateFilter.end = new Date(end_date).toISOString();
    } else {
      // Predefined periods
      switch (period) {
        case 'day':
          dateFilter.start = new Date(now.setHours(0, 0, 0, 0)).toISOString();
          dateFilter.end = new Date(now.setHours(23, 59, 59, 999)).toISOString();
          break;
        case 'week':
          const weekStart = new Date(now.setDate(now.getDate() - now.getDay()));
          dateFilter.start = new Date(weekStart.setHours(0, 0, 0, 0)).toISOString();
          dateFilter.end = new Date().toISOString();
          break;
        case 'month':
          dateFilter.start = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
          dateFilter.end = new Date().toISOString();
          break;
        case 'year':
          dateFilter.start = new Date(now.getFullYear(), 0, 1).toISOString();
          dateFilter.end = new Date().toISOString();
          break;
        case 'all':
        default:
          // No date filter
          break;
      }
    }

    // ============================================
    // BUILD BASE QUERY
    // ============================================
    
    let query = supabase
      .from('patrol_scans')
      .select(`
        scan_id,
        officer_id,
        qr_code_id,
        scan_timestamp,
        comments,
        security_officers!inner (
          employee_id,
          users!inner (
            first_name,
            last_name
          )
        ),
        qr_codes!inner (
          gate_name,
          location_description
        )
      `);

    // Apply filters
    if (officer_id) {
      query = query.eq('officer_id', officer_id);
    }

    if (dateFilter.start && dateFilter.end) {
      query = query
        .gte('scan_timestamp', dateFilter.start)
        .lte('scan_timestamp', dateFilter.end);
    }

    const { data: scans, error: scansError } = await query.order('scan_timestamp', { ascending: false });

    if (scansError) throw scansError;

    // ============================================
    // CALCULATE STATISTICS
    // ============================================

    // Total scans
    const totalScans = scans?.length || 0;

    // Unique officers
    const uniqueOfficers = scans 
      ? [...new Set(scans.map(scan => scan.officer_id))].length 
      : 0;

    // Unique locations
    const uniqueLocations = scans 
      ? [...new Set(scans.map(scan => scan.qr_code_id))].length 
      : 0;

    // First and last patrol
    const firstPatrol = scans && scans.length > 0 
      ? scans[scans.length - 1].scan_timestamp 
      : null;
    const lastPatrol = scans && scans.length > 0 
      ? scans[0].scan_timestamp 
      : null;

    // ============================================
    // OFFICER-WISE STATISTICS
    // ============================================

    const officerStats = scans 
      ? Object.values(
          scans.reduce((acc, scan) => {
            const officerId = scan.officer_id;
            
            if (!acc[officerId]) {
              acc[officerId] = {
                officer_id: officerId,
                employee_id: scan.security_officers.employee_id,
                first_name: scan.security_officers.users.first_name,
                last_name: scan.security_officers.users.last_name,
                total_scans: 0,
                unique_locations: new Set(),
                last_patrol: null,
                first_patrol: null
              };
            }

            acc[officerId].total_scans++;
            acc[officerId].unique_locations.add(scan.qr_code_id);
            
            if (!acc[officerId].last_patrol || scan.scan_timestamp > acc[officerId].last_patrol) {
              acc[officerId].last_patrol = scan.scan_timestamp;
            }
            
            if (!acc[officerId].first_patrol || scan.scan_timestamp < acc[officerId].first_patrol) {
              acc[officerId].first_patrol = scan.scan_timestamp;
            }

            return acc;
          }, {})
        ).map(officer => ({
          ...officer,
          unique_locations: officer.unique_locations.size
        }))
      : [];

    // Sort by total scans
    officerStats.sort((a, b) => b.total_scans - a.total_scans);

    // ============================================
    // LOCATION-WISE STATISTICS
    // ============================================

    const locationStats = scans 
      ? Object.values(
          scans.reduce((acc, scan) => {
            const locationId = scan.qr_code_id;
            
            if (!acc[locationId]) {
              acc[locationId] = {
                qr_code_id: locationId,
                gate_name: scan.qr_codes.gate_name,
                location_description: scan.qr_codes.location_description,
                total_scans: 0,
                unique_officers: new Set(),
                last_patrol: null,
                first_patrol: null
              };
            }

            acc[locationId].total_scans++;
            acc[locationId].unique_officers.add(scan.officer_id);
            
            if (!acc[locationId].last_patrol || scan.scan_timestamp > acc[locationId].last_patrol) {
              acc[locationId].last_patrol = scan.scan_timestamp;
            }
            
            if (!acc[locationId].first_patrol || scan.scan_timestamp < acc[locationId].first_patrol) {
              acc[locationId].first_patrol = scan.scan_timestamp;
            }

            return acc;
          }, {})
        ).map(location => ({
          ...location,
          unique_officers: location.unique_officers.size
        }))
      : [];

    // Sort by total scans
    locationStats.sort((a, b) => b.total_scans - a.total_scans);

    // ============================================
    // TIME-BASED STATISTICS (by hour)
    // ============================================

    const hourlyDistribution = scans 
      ? scans.reduce((acc, scan) => {
          const hour = new Date(scan.scan_timestamp).getHours();
          acc[hour] = (acc[hour] || 0) + 1;
          return acc;
        }, {})
      : {};

    // ============================================
    // DAILY STATISTICS (for the period)
    // ============================================

    const dailyStats = scans 
      ? Object.values(
          scans.reduce((acc, scan) => {
            const date = new Date(scan.scan_timestamp).toISOString().split('T')[0];
            
            if (!acc[date]) {
              acc[date] = {
                date,
                total_scans: 0,
                unique_officers: new Set(),
                unique_locations: new Set()
              };
            }

            acc[date].total_scans++;
            acc[date].unique_officers.add(scan.officer_id);
            acc[date].unique_locations.add(scan.qr_code_id);

            return acc;
          }, {})
        ).map(day => ({
          ...day,
          unique_officers: day.unique_officers.size,
          unique_locations: day.unique_locations.size
        }))
      : [];

    // Sort by date
    dailyStats.sort((a, b) => new Date(a.date) - new Date(b.date));

    // ============================================
    // CALCULATE AVERAGES
    // ============================================

    const daysInPeriod = dailyStats.length || 1;
    const averageScansPerDay = (totalScans / daysInPeriod).toFixed(2);
    const averageLocationsPerDay = (
      dailyStats.reduce((sum, day) => sum + day.unique_locations, 0) / daysInPeriod
    ).toFixed(2);

    // ============================================
    // GET PATROL ANOMALIES
    // ============================================

    let anomalyQuery = supabase
      .from('patrol_anomalies')
      .select(`
        anomaly_id,
        officer_id,
        anomaly_type,
        detection_date,
        status,
        notes,
        security_officers!inner (
          employee_id,
          users!inner (
            first_name,
            last_name
          )
        )
      `);

    if (officer_id) {
      anomalyQuery = anomalyQuery.eq('officer_id', officer_id);
    }

    if (dateFilter.start && dateFilter.end) {
      anomalyQuery = anomalyQuery
        .gte('detection_date', dateFilter.start)
        .lte('detection_date', dateFilter.end);
    }

    const { data: anomalies } = await anomalyQuery.order('detection_date', { ascending: false });

    const anomalyStats = {
      total: anomalies?.length || 0,
      by_type: anomalies 
        ? anomalies.reduce((acc, anomaly) => {
            acc[anomaly.anomaly_type] = (acc[anomaly.anomaly_type] || 0) + 1;
            return acc;
          }, {})
        : {},
      by_status: anomalies 
        ? anomalies.reduce((acc, anomaly) => {
            acc[anomaly.status] = (acc[anomaly.status] || 0) + 1;
            return acc;
          }, {})
        : {}
    };

    // ============================================
    // RESPONSE
    // ============================================

    console.log(`Patrol statistics fetched for period: ${period}`);

    return res.status(200).json({
      success: true,
      message: 'Patrol statistics retrieved successfully',
      data: {
        summary: {
          total_scans: totalScans,
          unique_officers: uniqueOfficers,
          unique_locations: uniqueLocations,
          first_patrol: firstPatrol,
          last_patrol: lastPatrol,
          period,
          date_range: dateFilter.start && dateFilter.end 
            ? { start: dateFilter.start, end: dateFilter.end }
            : null,
          averages: {
            scans_per_day: parseFloat(averageScansPerDay),
            locations_per_day: parseFloat(averageLocationsPerDay)
          }
        },
        officer_statistics: officerStats,
        location_statistics: locationStats,
        daily_statistics: dailyStats,
        hourly_distribution: hourlyDistribution,
        anomaly_statistics: anomalyStats,
        recent_anomalies: anomalies?.slice(0, 10) || []
      }
    });

  } catch (error) {
    console.error('❌ Error fetching patrol statistics:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch patrol statistics',
      error: error.message
    });
  }
};