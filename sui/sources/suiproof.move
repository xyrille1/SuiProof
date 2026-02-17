/// SuiProof - Content Anchoring Smart Contract
/// Fixed and optimized version
module suiproof::suiproof {
    use sui::table::{Self, Table};
    use sui::event;
    use std::string::{Self, String};

    // ==================== Error Codes ====================
    
    /// Error for when an anchor already exists for the given content hash.
    const E_ANCHOR_ALREADY_EXISTS: u64 = 0;
    /// Error for unauthorized access (no valid press pass)
    const E_UNAUTHORIZED: u64 = 1;
    /// Error for invalid agency
    const E_INVALID_AGENCY: u64 = 2;

    // ==================== Structs ====================

    /// Agency Object - represents a news organization registered on-chain
    public struct AgencyObject has key {
        id: UID,
        /// Agency name (e.g., "Associated Press")
        name: String,
        /// Unique agency identifier (e.g., "SUI_AP_091")
        agency_id: String,
        /// Admin/owner of the agency
        admin: address,
        /// Timestamp when agency was registered
        created_at: u64,
    }

    /// Press Pass - credential issued to journalists by their agency
    public struct PressPass has key, store {
        id: UID,
        /// Reference to the issuing agency's ID
        agency_id: String,
        /// Journalist's wallet address
        journalist: address,
        /// Journalist's name or identifier
        journalist_name: String,
        /// When the press pass was issued
        issued_at: u64,
        /// Optional expiration timestamp (0 = no expiration)
        expires_at: u64,
        /// Active status
        is_active: bool,
    }

    /// Media Manifest - represents an original media capture with full provenance
    public struct MediaManifest has key, store {
        id: UID,
        /// IPFS CID from Pinata
        ipfs_cid: String,
        /// BLAKE2b hash of the file content (vector<u8>)
        content_hash: vector<u8>,
        /// GPS coordinates (e.g., "40.7128N, 74.0060W")
        gps_coordinates: String,
        /// Agency ID (e.g., "SUI_AP_091")
        agency_id: String,
        /// The address of the creator (verified journalist)
        creator: address,
        /// Timestamp when anchored (in milliseconds)
        created_at: u64,
        /// Parent manifest ID for edited versions (0x0 for originals)
        parent_id: ID,
        /// Type of edit applied (empty string for originals)
        edit_type: String,
        /// Whether this is an original capture
        is_original: bool,
    }

    /// An anchor for a piece of content, identified by its hash.
    public struct Anchor has key, store {
        id: UID,
        /// The SHA256 hash of the content.
        content_hash: vector<u8>,
        /// The address of the creator of the anchor.
        creator: address,
        /// Timestamp when the anchor was created (in milliseconds)
        created_at: u64,
    }

    /// Information about an anchor, stored in the manifest.
    public struct AnchorInfo has store, copy, drop {
        anchor_id: ID,
        creator: address,
        created_at: u64,
    }

    /// A shared manifest of all content anchors.
    public struct Manifest has key {
        id: UID,
        /// A table mapping content hash to anchor information.
        anchors: Table<vector<u8>, AnchorInfo>,
        /// A list of all content hashes for enumeration.
        content_hashes: vector<vector<u8>>,
    }
    
    // ==================== Events ====================
    
    /// Event emitted when a new agency is registered
    public struct AgencyRegistered has copy, drop {
        agency_object_id: ID,
        name: String,
        agency_id: String,
        admin: address,
        created_at: u64,
    }
    
    /// Event emitted when a press pass is issued
    public struct PressPassIssued has copy, drop {
        pass_id: ID,
        agency_id: String,
        journalist: address,
        journalist_name: String,
        issued_at: u64,
    }
    
    /// Event emitted when a new media manifest is created
    public struct MediaAnchored has copy, drop {
        manifest_id: ID,
        ipfs_cid: String,
        content_hash_hex: String,
        gps_coordinates: String,
        agency_id: String,
        creator: address,
        created_at: u64,
        parent_id: ID,
        is_original: bool,
    }
    
    /// Event emitted when a new anchor is created.
    public struct AnchorCreated has copy, drop {
        anchor_id: ID,
        content_hash: vector<u8>,
        content_hash_hex: String,
        creator: address,
        created_at: u64,
    }

    // ==================== Initialization ====================

    /// Initializes the contract by creating a new shared Manifest.
    fun init(ctx: &mut TxContext) {
        let manifest = Manifest {
            id: object::new(ctx),
            anchors: table::new(ctx),
            content_hashes: vector::empty(),
        };
        transfer::share_object(manifest);
    }

    // ==================== Public Entry Functions ====================

    /// Phase 1: Register a news agency on-chain
    /// Called by an agency admin to establish institutional identity
    public entry fun register_agency(
        name: vector<u8>,
        agency_id: vector<u8>,
        ctx: &mut TxContext,
    ) {
        let sender = tx_context::sender(ctx);
        let created_at = tx_context::epoch_timestamp_ms(ctx);
        
        let agency = AgencyObject {
            id: object::new(ctx),
            name: string::utf8(name),
            agency_id: string::utf8(agency_id),
            admin: sender,
            created_at,
        };
        
        let agency_id_obj = object::id(&agency);
        
        event::emit(AgencyRegistered {
            agency_object_id: agency_id_obj,
            name: agency.name,
            agency_id: agency.agency_id,
            admin: sender,
            created_at,
        });
        
        // Transfer agency object to admin
        transfer::transfer(agency, sender);
    }

    /// Phase 1: Issue a press pass to a journalist
    /// Called by agency admin to credential their journalists
    public entry fun issue_press_pass(
        agency: &AgencyObject,
        journalist: address,
        journalist_name: vector<u8>,
        expires_at: u64,
        ctx: &mut TxContext,
    ) {
        // Verify sender is the agency admin
        assert!(tx_context::sender(ctx) == agency.admin, E_UNAUTHORIZED);
        
        let issued_at = tx_context::epoch_timestamp_ms(ctx);
        
        let press_pass = PressPass {
            id: object::new(ctx),
            agency_id: agency.agency_id,
            journalist,
            journalist_name: string::utf8(journalist_name),
            issued_at,
            expires_at,
            is_active: true,
        };
        
        let pass_id = object::id(&press_pass);
        
        event::emit(PressPassIssued {
            pass_id,
            agency_id: press_pass.agency_id,
            journalist,
            journalist_name: press_pass.journalist_name,
            issued_at,
        });
        
        // Transfer press pass to journalist
        transfer::transfer(press_pass, journalist);
    }

    /// Phase 2: Anchors original media with full provenance data
    /// This is the main function called during "Shutter Click" workflow
    /// Can be sponsored by institutional node (gas paid by sponsor, not journalist)
    public entry fun anchor_original_media(
        ipfs_cid: vector<u8>,
        content_hash: vector<u8>,
        gps_coordinates: vector<u8>,
        agency_id: vector<u8>,
        ctx: &mut TxContext,
    ) {
        let sender = tx_context::sender(ctx);
        let created_at = tx_context::epoch_timestamp_ms(ctx);
        
        // Create the MediaManifest object (original capture)
        let media_manifest = MediaManifest {
            id: object::new(ctx),
            ipfs_cid: string::utf8(ipfs_cid),
            content_hash,
            gps_coordinates: string::utf8(gps_coordinates),
            agency_id: string::utf8(agency_id),
            creator: sender,
            created_at,
            parent_id: object::id_from_address(@0x0), // No parent for originals
            edit_type: string::utf8(b""), // Empty for originals
            is_original: true,
        };
        
        let manifest_id = object::id(&media_manifest);
        let content_hash_hex = bytes_to_hex_string(&content_hash);
        
        // Emit event for indexing
        event::emit(MediaAnchored {
            manifest_id,
            ipfs_cid: media_manifest.ipfs_cid,
            content_hash_hex,
            gps_coordinates: media_manifest.gps_coordinates,
            agency_id: media_manifest.agency_id,
            creator: sender,
            created_at,
            parent_id: media_manifest.parent_id,
            is_original: true,
        });
        
        // Transfer the MediaManifest to the creator
        transfer::transfer(media_manifest, sender);
    }

    /// Phase 3: Create an edited version of media (e.g., cropped, color-corrected)
    /// Links back to original via parent_id
    public entry fun create_edited_version(
        original_manifest: &MediaManifest,
        new_ipfs_cid: vector<u8>,
        new_content_hash: vector<u8>,
        edit_type: vector<u8>, // e.g., "Cropped 20%", "Color Correction"
        ctx: &mut TxContext,
    ) {
        let sender = tx_context::sender(ctx);
        let created_at = tx_context::epoch_timestamp_ms(ctx);
        
        // Create edited version manifest
        let edited_manifest = MediaManifest {
            id: object::new(ctx),
            ipfs_cid: string::utf8(new_ipfs_cid),
            content_hash: new_content_hash,
            gps_coordinates: original_manifest.gps_coordinates, // Inherit from original
            agency_id: original_manifest.agency_id, // Inherit from original
            creator: sender,
            created_at,
            parent_id: object::id(original_manifest), // Link to original
            edit_type: string::utf8(edit_type),
            is_original: false,
        };
        
        let manifest_id = object::id(&edited_manifest);
        let content_hash_hex = bytes_to_hex_string(&new_content_hash);
        
        // Emit event
        event::emit(MediaAnchored {
            manifest_id,
            ipfs_cid: edited_manifest.ipfs_cid,
            content_hash_hex,
            gps_coordinates: edited_manifest.gps_coordinates,
            agency_id: edited_manifest.agency_id,
            creator: sender,
            created_at,
            parent_id: edited_manifest.parent_id,
            is_original: false,
        });
        
        // Transfer to creator
        transfer::transfer(edited_manifest, sender);
    }

    /// Creates a new content anchor and adds it to the manifest.
    public entry fun create_anchor(
        manifest: &mut Manifest,
        content_hash: vector<u8>,
        ctx: &mut TxContext,
    ) {
        // Ensure the anchor doesn't already exist.
        assert!(!table::contains(&manifest.anchors, content_hash), E_ANCHOR_ALREADY_EXISTS);

        let sender = tx_context::sender(ctx);
        let created_at = tx_context::epoch_timestamp_ms(ctx);
        
        let anchor = Anchor {
            id: object::new(ctx),
            content_hash: content_hash,
            creator: sender,
            created_at,
        };

        let anchor_id = object::id(&anchor);
        
        // Create anchor info for the manifest
        let anchor_info = AnchorInfo {
            anchor_id,
            creator: sender,
            created_at,
        };
        
        // Convert hash to hex string for event
        let hex_string = bytes_to_hex_string(&anchor.content_hash);
        
        // Emit event
        event::emit(AnchorCreated {
            anchor_id,
            content_hash: anchor.content_hash,
            content_hash_hex: hex_string,
            creator: sender,
            created_at,
        });

        // Store the hash in the list for enumeration
        vector::push_back(&mut manifest.content_hashes, anchor.content_hash);
        
        // Add to the manifest table
        table::add(&mut manifest.anchors, anchor.content_hash, anchor_info);

        // Transfer the anchor object to the creator
        transfer::transfer(anchor, sender);
    }

    // ==================== View Functions ====================

    /// Verifies if an anchor exists for the given content hash.
    public fun verify_content(
        manifest: &Manifest,
        content_hash: vector<u8>,
    ): bool {
        table::contains(&manifest.anchors, content_hash)
    }

    /// Gets the details of an anchor by its content hash.
    /// Returns Option<AnchorInfo> to handle cases where anchor doesn't exist.
    public fun get_anchor_info(
        manifest: &Manifest,
        content_hash: vector<u8>,
    ): AnchorInfo {
        *table::borrow(&manifest.anchors, content_hash)
    }

    /// Checks if an anchor exists and returns the info if it does.
    public fun try_get_anchor_info(
        manifest: &Manifest,
        content_hash: vector<u8>,
    ): (bool, AnchorInfo) {
        if (table::contains(&manifest.anchors, content_hash)) {
            let info = *table::borrow(&manifest.anchors, content_hash);
            (true, info)
        } else {
            // Return a default AnchorInfo with zero values
            let default_info = AnchorInfo {
                anchor_id: object::id_from_address(@0x0),
                creator: @0x0,
                created_at: 0,
            };
            (false, default_info)
        }
    }

    /// Gets the list of all content hashes.
    public fun get_content_hashes(
        manifest: &Manifest,
    ): vector<vector<u8>> {
        manifest.content_hashes
    }

    /// Gets the total number of anchors in the manifest.
    public fun get_anchor_count(manifest: &Manifest): u64 {
        vector::length(&manifest.content_hashes)
    }

    /// Gets a paginated list of anchor infos from the manifest.
    public fun get_paginated_anchor_infos(
        manifest: &Manifest,
        start: u64,
        limit: u64,
    ): vector<AnchorInfo> {
        let mut infos = vector::empty<AnchorInfo>();
        let len = vector::length(&manifest.content_hashes);
        
        // Return empty vector if start is beyond the list
        if (start >= len) {
            return infos
        };
        
        // Calculate the end index
        let end = if (start + limit > len) { len } else { start + limit };
        
        // Collect anchor infos
        let mut i = start;
        while (i < end) {
            let content_hash = *vector::borrow(&manifest.content_hashes, i);
            let anchor_info = table::borrow(&manifest.anchors, content_hash);
            vector::push_back(&mut infos, *anchor_info);
            i = i + 1;
        };
        
        infos
    }

    /// Gets anchor info by creator address.
    public fun get_anchors_by_creator(
        manifest: &Manifest,
        creator: address,
    ): vector<AnchorInfo> {
        let mut result = vector::empty<AnchorInfo>();
        let len = vector::length(&manifest.content_hashes);
        let mut i = 0;
        
        while (i < len) {
            let content_hash = *vector::borrow(&manifest.content_hashes, i);
            let anchor_info = table::borrow(&manifest.anchors, content_hash);
            
            if (anchor_info.creator == creator) {
                vector::push_back(&mut result, *anchor_info);
            };
            
            i = i + 1;
        };
        
        result
    }

    // ==================== Utility Functions ====================

    /// Converts bytes to hexadecimal string representation.
    fun bytes_to_hex_string(bytes: &vector<u8>): String {
        let hex_chars = b"0123456789abcdef";
        let len = vector::length(bytes);
        let mut hex_bytes = vector::empty<u8>();
        
        let mut i = 0;
        while (i < len) {
            let byte = *vector::borrow(bytes, i);
            let high = byte / 16;
            let low = byte % 16;
            vector::push_back(&mut hex_bytes, *vector::borrow(&hex_chars, (high as u64)));
            vector::push_back(&mut hex_bytes, *vector::borrow(&hex_chars, (low as u64)));
            i = i + 1;
        };
        
        string::utf8(hex_bytes)
    }

    /// Get anchor creator address.
    public fun get_anchor_creator(anchor: &Anchor): address {
        anchor.creator
    }

    /// Get anchor content hash.
    public fun get_anchor_content_hash(anchor: &Anchor): vector<u8> {
        anchor.content_hash
    }

    /// Get anchor creation timestamp.
    public fun get_anchor_created_at(anchor: &Anchor): u64 {
        anchor.created_at
    }

    /// Get AnchorInfo fields.
    public fun get_anchor_info_fields(info: &AnchorInfo): (ID, address, u64) {
        (info.anchor_id, info.creator, info.created_at)
    }

    // ==================== Test-Only Functions ====================
    
    #[test_only]
    /// Initialize for testing.
    public fun init_for_testing(ctx: &mut TxContext) {
        init(ctx);
    }
}
