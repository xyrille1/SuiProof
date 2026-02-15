module suiproof::suiproof {
    use sui::object::{Self, ID, UID};
    use sui::transfer;
    use sui::tx_context::{Self, TxContext};
    use sui::table::{Self, Table};
    use std::vector;
    use sui::event;

    /// Error for when an anchor already exists for the given content hash.
    const EAnchorAlreadyExists: u64 = 0;

    /// An anchor for a piece of content, identified by its hash.
    struct Anchor has key, store {
        id: UID,
        /// The SHA256 hash of the content.
        content_hash: vector<u8>,
        /// The address of the creator of the anchor.
        creator: address,
    }

    /// Information about an anchor, stored in the manifest.
    struct AnchorInfo has store, copy, drop {
        anchor_id: ID,
        creator: address,
    }

    /// A shared manifest of all content anchors.
    struct Manifest has key {
        id: UID,
        /// A table mapping content hash to anchor information.
        anchors: Table<vector<u8>, AnchorInfo>,
    }
    
    /// Event emitted when a new anchor is created.
    struct AnchorCreated has copy, drop {
        anchor_id: ID,
        content_hash: vector<u8>,
        creator: address,
    }

    /// Initializes the contract by creating a new shared Manifest.
    fun init(ctx: &mut TxContext) {
        let manifest = Manifest {
            id: object::new(ctx),
            anchors: table::new(ctx),
        };
        transfer::share_object(manifest);
    }

    /// Creates a new content anchor and adds it to the manifest.
    public entry fun create_anchor(
        manifest: &mut Manifest,
        content_hash: vector<u8>,
        ctx: &mut TxContext,
    ) {
        // Ensure the anchor doesn't already exist.
        assert!(!table::contains(&manifest.anchors, &content_hash), EAnchorAlreadyExists);

        let sender = tx_context::sender(ctx);
        let anchor = Anchor {
            id: object::new(ctx),
            content_hash: vector::clone(&content_hash),
            creator: sender,
        };

        let anchor_id = object::id(&anchor);
        let anchor_info = AnchorInfo {
            anchor_id,
            creator: sender,
        };
        table::add(&mut manifest.anchors, content_hash, anchor_info);
        
        event::emit(AnchorCreated {
            anchor_id,
            content_hash,
            creator: sender,
        });

        transfer::transfer(anchor, sender);
    }

    /// Verifies if an anchor exists for the given content hash.
    public fun verify_content(
        manifest: &Manifest,
        content_hash: &vector<u8>,
    ): bool {
        table::contains(&manifest.anchors, content_hash)
    }

    /// Gets the details of an anchor by its content hash.
    public fun get_anchor_info(
        manifest: &Manifest,
        content_hash: &vector<u8>,
    ): AnchorInfo {
        *table::borrow(&manifest.anchors, content_hash)
    }
}
