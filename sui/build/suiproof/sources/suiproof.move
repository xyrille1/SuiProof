/// SuiProof - Content Anchoring Smart Contract
/// Fixed and optimized version
module suiproof::suiproof {
    use sui::table::{Self, Table};
    use sui::event;
    use std::string::{Self, String};
    use sui::object;

    // ==================== Error Codes ====================
    
    /// Error for when an anchor already exists for the given content hash.
    const E_ANCHOR_ALREADY_EXISTS: u64 = 0;

    // ==================== Structs ====================

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
