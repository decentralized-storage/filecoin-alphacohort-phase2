export async function list(
    address: string,
    debug?: boolean,
    apiUrl?: string,
    filter?: {
        filterBy?: {
            field: string;
            value: string | number | boolean;
            operator?: 'equals' | 'contains' | 'startsWith' | 'endsWith';
        };
        sortBy?: {
            field: string;
            direction?: 'asc' | 'desc';
        };
        pagination?: {
            pageSize?: number;
            maxPages?: number;
        };
    }
  ) {
    // If localURL is provided, use it, otherwise use the default
    const baseUrl = apiUrl || 'https://api.keypo.io';
    const pageSize = filter?.pagination?.pageSize || 100;
    const maxPages = filter?.pagination?.maxPages || Infinity;
  
    if (debug) {
        console.log("[DEBUG] Pagination settings:", { pageSize, maxPages });
    }
  
    // Helper function to fetch a single page of data
    async function fetchPage(skip: number, isOwner: boolean) {
        const endpoint = isOwner ? 'filesByOwner' : 'filesByMinter';
        const url = `${baseUrl}/graph/${endpoint}?file${isOwner ? 'Owner' : 'Minter'}Address=${address}&skip=${skip}&first=${pageSize}`;
        
        if (debug) {
            console.log(`[DEBUG] Fetching ${endpoint} page at skip=${skip}:`, url);
        }
  
        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
            },
        });
  
        if (!response.ok) {
            throw new Error(`API request failed with status ${response.status}`);
        }
  
        return response.json();
    }
  
    // Helper function to check if files are deleted (batch version)
    async function areFilesDeleted(fileIdentifiers: string[]): Promise<{ [key: string]: boolean }> {
        const url = `${baseUrl}/graph/isDeleted?fileIdentifiers=${encodeURIComponent(JSON.stringify(fileIdentifiers))}`;
        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
            },
        });
  
        if (!response.ok) {
            throw new Error(`API request failed with status ${response.status}`);
        }
  
        const data = await response.json();
        return data.deletedFiles || {};
    }
  
    // Helper function to fetch all pages for a given endpoint
    async function fetchAllPages(isOwner: boolean) {
        const allData: {
            permissionedFileDeployeds: Array<{
                fileIdentifier: string;
                fileMetadata: string;
                fileContractAddress: string;
                fileOwner: string;
            }>;
            permissionedFileAccessMinteds: Array<{
                fileIdentifier: string;
                fileMetadata: string;
                fileContractAddress: string;
                fileOwner: string;
            }>;
        } = { permissionedFileDeployeds: [], permissionedFileAccessMinteds: [] };
        
        let skip = 0;
        let page = 0;
        let hasMore = true;
  
        while (hasMore && page < maxPages) {
            const pageData = await fetchPage(skip, isOwner);
            
            if (debug) {
                console.log(`[DEBUG] Got ${isOwner ? 'owner' : 'minter'} page ${page + 1}:`, pageData);
            }
  
            // Add the page data to our collection
            allData.permissionedFileDeployeds = [
                ...allData.permissionedFileDeployeds,
                ...(pageData.permissionedFileDeployeds || [])
            ];
            allData.permissionedFileAccessMinteds = [
                ...allData.permissionedFileAccessMinteds,
                ...(pageData.permissionedFileAccessMinteds || [])
            ];
  
            // Check if we have more pages
            hasMore = (pageData.permissionedFileDeployeds || []).length === pageSize;
            skip += pageSize;
            page++;
  
            if (debug) {
                console.log(`[DEBUG] Processed ${isOwner ? 'owner' : 'minter'} page ${page}. Has more:`, hasMore);
            }
        }
  
        return allData;
    }
  
    // Fetch both owner and minter data with pagination
    const [ownerData, minterData] = await Promise.all([
        fetchAllPages(true),
        fetchAllPages(false)
    ]);
  
    if (debug) {
        console.log("[DEBUG] Total owner files:", ownerData.permissionedFileDeployeds.length);
        console.log("[DEBUG] Total minter files:", minterData.permissionedFileDeployeds.length);
        console.log("[DEBUG] Total owner access minted files:", ownerData.permissionedFileAccessMinteds.length);
        console.log("[DEBUG] Total minter access minted files:", minterData.permissionedFileAccessMinteds.length);
    }
  
    // Helper function to extract metadata fields
    const extractMetadata = (fileMetadata: any) => {
        // Check for pieceCID in filecoinStorageInfo (with both cases)
        const pieceCid = fileMetadata.filecoinStorageInfo?.pieceCID || 
                        fileMetadata.filecoinStorageInfo?.pieceCid ||
                        fileMetadata.pieceCID || 
                        fileMetadata.pieceCid;
        
        return {
            name: fileMetadata.name,
            type: fileMetadata.type,
            mimeType: fileMetadata.mimeType,
            subtype: fileMetadata.subtype,
            pieceCid: pieceCid,
            accessType: fileMetadata.accessType, // Add accessType field
            userMetaData: JSON.stringify(fileMetadata) // Store the complete metadata
        };
    };
  
    // Helper function to check if file has pieceCid in filecoinStorageInfo
    const hasFilecoinStorage = (fileMetadata: any) => {
        return !!(fileMetadata.filecoinStorageInfo?.pieceCID || 
                 fileMetadata.filecoinStorageInfo?.pieceCid);
    };
    
    // Helper function to check if file has all required metadata fields
    const hasRequiredMetadata = (fileMetadata: any) => {
        // Must have pieceCid in filecoinStorageInfo ONLY
        if (!hasFilecoinStorage(fileMetadata)) return false;
        
        // Must NOT have encryptedData with ipfsHash (we don't want encrypted files)
        if (fileMetadata.encryptedData?.ipfsHash) return false;
        
        return true;
    };
  
    // Helper function to check if a file matches the filter
    const matchesFilter = (file: any) => {
        if (!filter?.filterBy) return true;
  
        const fieldValue = file.dataMetadata[filter.filterBy.field];
        if (fieldValue === undefined) return false;
  
        switch (filter.filterBy.operator) {
            case 'contains':
                return String(fieldValue).toLowerCase().includes(String(filter.filterBy.value).toLowerCase());
            case 'startsWith':
                return String(fieldValue).toLowerCase().startsWith(String(filter.filterBy.value).toLowerCase());
            case 'endsWith':
                return String(fieldValue).toLowerCase().endsWith(String(filter.filterBy.value).toLowerCase());
            case 'equals':
            default:
                return String(fieldValue).toLowerCase() === String(filter.filterBy.value).toLowerCase();
        }
    };
  
    // Process all files (both deployed and access minted)
    const allFiles: { [key: string]: any } = {};
    const processedFileIds = new Set<string>();
    
    // Track which files have access minted (appears in permissionedFileAccessMinteds)
    const accessMintedFileIds = new Set<string>();
    
    // First, collect all file identifiers that have access minted
    for (const file of ownerData.permissionedFileAccessMinteds || []) {
        accessMintedFileIds.add(file.fileIdentifier.toLowerCase());
    }
    for (const file of minterData.permissionedFileAccessMinteds || []) {
        accessMintedFileIds.add(file.fileIdentifier.toLowerCase());
    }
    
    // Process deployed files from owner endpoint
    for (const file of ownerData.permissionedFileDeployeds || []) {
        const dataIdentifier = file.fileIdentifier.toLowerCase();
        if (!processedFileIds.has(dataIdentifier)) {
            const fileMetadata = JSON.parse(file.fileMetadata);
            // Only process files that have all required metadata
            if (hasRequiredMetadata(fileMetadata)) {
                const fileData = {
                    cid: fileMetadata.filecoinStorageInfo?.pieceCID || fileMetadata.filecoinStorageInfo?.pieceCid || '',
                    dataContractAddress: file.fileContractAddress,
                    dataIdentifier: dataIdentifier,
                    dataMetadata: extractMetadata(fileMetadata),
                    owner: file.fileOwner,
                    isAccessMinted: accessMintedFileIds.has(dataIdentifier) // Check if this file has access minted
                };
                
                if (matchesFilter(fileData)) {
                    allFiles[dataIdentifier] = fileData;
                    processedFileIds.add(dataIdentifier);
                }
            }
        }
    }
  
    // Process access minted files from owner endpoint (only if not already processed)
    for (const file of ownerData.permissionedFileAccessMinteds || []) {
        const dataIdentifier = file.fileIdentifier.toLowerCase();
        if (!processedFileIds.has(dataIdentifier)) {
            const fileMetadata = JSON.parse(file.fileMetadata);
            // Only process files that have all required metadata
            if (hasRequiredMetadata(fileMetadata)) {
                const fileData = {
                    cid: fileMetadata.filecoinStorageInfo?.pieceCID || fileMetadata.filecoinStorageInfo?.pieceCid || '',
                    dataContractAddress: file.fileContractAddress,
                    dataIdentifier: dataIdentifier,
                    dataMetadata: extractMetadata(fileMetadata),
                    owner: file.fileOwner,
                    isAccessMinted: true // These are definitely access minted
                };
                
                if (matchesFilter(fileData)) {
                    allFiles[dataIdentifier] = fileData;
                    processedFileIds.add(dataIdentifier);
                }
            }
        }
    }
  
    // Process deployed files from minter endpoint
    for (const file of minterData.permissionedFileDeployeds || []) {
        const dataIdentifier = file.fileIdentifier.toLowerCase();
        if (!processedFileIds.has(dataIdentifier)) {
            const fileMetadata = JSON.parse(file.fileMetadata);
            // Only process files that have all required metadata
            if (hasRequiredMetadata(fileMetadata)) {
                const fileData = {
                    cid: fileMetadata.filecoinStorageInfo?.pieceCID || fileMetadata.filecoinStorageInfo?.pieceCid || '',
                    dataContractAddress: file.fileContractAddress,
                    dataIdentifier: dataIdentifier,
                    dataMetadata: extractMetadata(fileMetadata),
                    owner: file.fileOwner,
                    isAccessMinted: accessMintedFileIds.has(dataIdentifier) // Check if this file has access minted
                };
                
                if (matchesFilter(fileData)) {
                    allFiles[dataIdentifier] = fileData;
                    processedFileIds.add(dataIdentifier);
                }
            }
        }
    }
  
    // Process access minted files from minter endpoint (only if not already processed)
    for (const file of minterData.permissionedFileAccessMinteds || []) {
        const dataIdentifier = file.fileIdentifier.toLowerCase();
        if (!processedFileIds.has(dataIdentifier)) {
            const fileMetadata = JSON.parse(file.fileMetadata);
            // Only process files that have all required metadata
            if (hasRequiredMetadata(fileMetadata)) {
                const fileData = {
                    cid: fileMetadata.filecoinStorageInfo?.pieceCID || fileMetadata.filecoinStorageInfo?.pieceCid || '',
                    dataContractAddress: file.fileContractAddress,
                    dataIdentifier: dataIdentifier,
                    dataMetadata: extractMetadata(fileMetadata),
                    owner: file.fileOwner,
                    isAccessMinted: true // These are definitely access minted
                };
                
                if (matchesFilter(fileData)) {
                    allFiles[dataIdentifier] = fileData;
                    processedFileIds.add(dataIdentifier);
                }
            }
        }
    }
  
    // Filter out deleted files using batch request
    const finalFiles: { [key: string]: any } = {};
  
    try {
        // Get all file identifiers
        const allFileIdentifiers = Object.keys(allFiles);
        
        if (debug) {
            console.log(`[DEBUG] Checking deletion status for ${allFileIdentifiers.length} files`);
        }
  
        if (allFileIdentifiers.length > 0) {
            // Batch check deletion status
            const deletionStatuses = await areFilesDeleted(allFileIdentifiers);
            
            // Filter out deleted files
            Object.entries(allFiles).forEach(([dataIdentifier, fileData]) => {
                const isDeleted = deletionStatuses[dataIdentifier] || false;
                if (!isDeleted) {
                    finalFiles[dataIdentifier] = fileData;
                } else if (debug) {
                    console.log(`[DEBUG] Filtered out deleted file: ${dataIdentifier}`);
                }
            });
  
            if (debug) {
                console.log(`[DEBUG] Files after deletion filter: ${Object.keys(finalFiles).length}`);
            }
        }
  
    } catch (error) {
        console.warn('Failed to check deletion status, including all files:', error);
        // If batch deletion check fails, include all files
        Object.assign(finalFiles, allFiles);
    }
  
    // Apply sorting if specified
    if (filter?.sortBy) {
        const sortBy = filter.sortBy;
        const sortedEntries = Object.entries(finalFiles).sort(([, a], [, b]) => {
            const aValue = a.dataMetadata[sortBy.field];
            const bValue = b.dataMetadata[sortBy.field];
  
            // Handle undefined values
            if (aValue === undefined && bValue === undefined) return 0;
            if (aValue === undefined) return sortBy.direction === 'desc' ? 1 : -1;
            if (bValue === undefined) return sortBy.direction === 'desc' ? -1 : 1;
  
            // Compare values
            const comparison = String(aValue).localeCompare(String(bValue));
            return sortBy.direction === 'desc' ? -comparison : comparison;
        });
  
        // Convert sorted entries back to object
        return Object.fromEntries(sortedEntries);
    }
  
    if (debug) {
        console.log("[DEBUG] Final combined data:", finalFiles);
    }
  
    return finalFiles;
  } 