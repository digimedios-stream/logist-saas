const DB_NAME = 'lazdin_offline_db'
const DB_VERSION = 1
const STORE_CARGAS = 'offline_cargas'
const STORE_NOVEDADES = 'offline_novedades'

function initDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)

    request.onerror = () => reject(request.error)
    
    request.onsuccess = () => resolve(request.result)

    request.onupgradeneeded = (event) => {
      const db = event.target.result
      if (!db.objectStoreNames.contains(STORE_CARGAS)) {
        db.createObjectStore(STORE_CARGAS, { keyPath: 'id', autoIncrement: true })
      }
      if (!db.objectStoreNames.contains(STORE_NOVEDADES)) {
        db.createObjectStore(STORE_NOVEDADES, { keyPath: 'id', autoIncrement: true })
      }
    }
  })
}

export async function saveOfflineRecord(storeName, data) {
  const db = await initDB()
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, 'readwrite')
    const store = transaction.objectStore(storeName)
    const request = store.add(data)

    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

export async function getOfflineRecords(storeName) {
  const db = await initDB()
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, 'readonly')
    const store = transaction.objectStore(storeName)
    const request = store.getAll()

    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

export async function deleteOfflineRecord(storeName, id) {
  const db = await initDB()
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, 'readwrite')
    const store = transaction.objectStore(storeName)
    const request = store.delete(id)

    request.onsuccess = () => resolve()
    request.onerror = () => reject(request.error)
  })
}

export const STORES = {
  CARGAS: STORE_CARGAS,
  NOVEDADES: STORE_NOVEDADES
}
