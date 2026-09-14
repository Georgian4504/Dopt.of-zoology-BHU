/**
 * Department of Zoology — Banaras Hindu University
 * Supabase File Upload & Storage Management
 * 
 * Hosting: GitHub Pages
 * Backend: Supabase Storage ('study-materials') + Database Table ('materials')
 */

// Validation Constants
const ALLOWED_EXTENSIONS = ['pdf', 'ppt', 'pptx', 'doc', 'docx', 'jpg', 'jpeg', 'png', 'webp'];
const MAX_FILE_SIZE_BYTES = 25 * 1024 * 1024; // 25 MB

/**
 * Validates selected file before upload
 * @param {File} file 
 * @returns {boolean} true if valid, throws Error otherwise
 */
function validateFile(file) {
  if (!file) {
    const err = new Error("Please select a file to upload.");
    console.error(err);
    alert(err.message);
    throw err;
  }

  const filename = file.name || '';
  const lastDot = filename.lastIndexOf('.');
  const ext = lastDot !== -1 ? filename.substring(lastDot + 1).toLowerCase() : '';

  if (!ext || !ALLOWED_EXTENSIONS.includes(ext)) {
    const err = new Error(
      `File format ".${ext || 'unknown'}" is not supported.\nAllowed formats: ${ALLOWED_EXTENSIONS.join(', ')}.`
    );
    console.error(err);
    alert(err.message);
    throw err;
  }

  if (file.size > MAX_FILE_SIZE_BYTES) {
    const sizeInMB = (file.size / (1024 * 1024)).toFixed(2);
    const err = new Error(
      `File size (${sizeInMB} MB) exceeds the maximum limit of 25 MB. Please select a smaller file.`
    );
    console.error(err);
    alert(err.message);
    throw err;
  }

  return true;
}

/**
 * Format semester code to standard path component
 * e.g., "sem1" -> "semester-1"
 */
function formatSemesterPath(semesterVal) {
  if (!semesterVal) return 'semester-1';
  const match = semesterVal.match(/\d+/);
  if (match) {
    return `semester-${match[0]}`;
  }
  return semesterVal.toLowerCase().replace(/[^a-z0-9_-]/g, '-');
}

/**
 * Sanitize subject / paper code for storage folder
 * e.g., "ZOM 101" -> "ZOM101"
 */
function sanitizeSubjectFolder(subjectVal) {
  if (!subjectVal) return 'GENERAL';
  return subjectVal.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
}

/**
 * Clean original filename keeping extension
 * e.g., "Lecture Note 1 (Biochemistry).pdf" -> "Lecture_Note_1_Biochemistry.pdf"
 */
function sanitizeOriginalFilename(originalName) {
  if (!originalName) return 'material.pdf';
  const lastDot = originalName.lastIndexOf('.');
  const base = lastDot !== -1 ? originalName.substring(0, lastDot) : originalName;
  const ext = lastDot !== -1 ? originalName.substring(lastDot) : '';
  const cleanBase = base
    .replace(/[^a-zA-Z0-9_-]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '');
  return `${cleanBase || 'file'}${ext.toLowerCase()}`;
}

/**
 * Generate standard storage path:
 * semester-1/ZOM101/1726318822_Biochemistry.pdf
 */
function generateStoragePath(semester, subject, originalFilename) {
  const semFolder = formatSemesterPath(semester);
  const subjFolder = sanitizeSubjectFolder(subject);
  const timestamp = Math.floor(Date.now() / 1000); // Unix timestamp in seconds
  const cleanName = sanitizeOriginalFilename(originalFilename);
  const uniqueFilename = `${timestamp}_${cleanName}`;
  return `${semFolder}/${subjFolder}/${uniqueFilename}`;
}

/**
 * Update the visual upload status on the form
 * @param {'idle' | 'uploading' | 'success' | 'failed'} state 
 * @param {string} [message] 
 */
function setUploadStatusUI(state, message) {
  const statusBox = document.getElementById('upload-status-indicator');
  const submitBtn = document.getElementById('upload-submit-btn');

  if (!statusBox) return;

  if (state === 'uploading') {
    statusBox.style.display = 'block';
    statusBox.style.background = '#eff6ff';
    statusBox.style.border = '1px solid #93c5fd';
    statusBox.style.color = '#1e40af';
    statusBox.innerHTML = `
      <div style="display:flex; align-items:center; gap:8px;">
        <span style="display:inline-block; animation:spin 1s linear infinite;">⏳</span>
        <strong>Uploading…</strong> <span style="font-size:0.85em;">${message || 'Transferring file to Supabase Storage...'}</span>
      </div>
    `;
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.textContent = 'Uploading…';
    }
  } else if (state === 'success') {
    statusBox.style.display = 'block';
    statusBox.style.background = '#f0fdf4';
    statusBox.style.border = '1px solid #86efac';
    statusBox.style.color = '#166534';
    statusBox.innerHTML = `
      <div style="display:flex; align-items:center; gap:8px;">
        <span style="font-size:1.1em;">✓</span>
        <strong>Success ✓</strong> <span style="font-size:0.85em;">${message || 'Study material uploaded and published!'}</span>
      </div>
    `;
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.textContent = 'Uploaded ✓';
    }
  } else if (state === 'failed') {
    statusBox.style.display = 'block';
    statusBox.style.background = '#fef2f2';
    statusBox.style.border = '1px solid #fca5a5';
    statusBox.style.color = '#991b1b';
    statusBox.innerHTML = `
      <div style="display:flex; align-items:flex-start; gap:8px;">
        <span style="font-size:1.1em; line-height:1;">❌</span>
        <div>
          <strong>Failed:</strong>
          <div style="margin-top:2px; font-size:0.85em; word-break:break-word;">${message || 'An unexpected error occurred.'}</div>
        </div>
      </div>
    `;
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.textContent = 'Save to Bookshelf';
    }
  } else {
    statusBox.style.display = 'none';
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.textContent = 'Save to Bookshelf';
    }
  }
}

/**
 * Main Direct Supabase Storage Upload & Metadata Handler
 * @param {HTMLFormElement | Event} formOrEvent 
 */
async function handleStudyMaterialUpload(formOrEvent) {
  if (formOrEvent && typeof formOrEvent.preventDefault === 'function') {
    formOrEvent.preventDefault();
  }

  const client = window.supabaseClient || (typeof getSupabaseClient === 'function' ? getSupabaseClient() : null);

  if (!client) {
    const error = new Error("Supabase client is not initialized. Please verify your connection configuration.");
    console.error(error);
    alert(error.message);
    setUploadStatusUI('failed', error.message);
    return;
  }

  // Retrieve form inputs
  const uploaderNameInput = document.getElementById('modal-student-name');
  const semesterSelect = document.getElementById('modal-semester-select');
  const paperSelect = document.getElementById('modal-paper-select');
  const topicSelect = document.getElementById('modal-topic-select');
  const materialTypeSelect = document.getElementById('modal-material-type');
  const titleInput = document.getElementById('modal-material-title');
  const descInput = document.getElementById('modal-material-desc');
  const fileInput = document.getElementById('modal-file-input');

  const uploaderName = uploaderNameInput ? uploaderNameInput.value.trim() : '';
  const semester = semesterSelect ? semesterSelect.value : 'sem1';
  const subject = paperSelect ? paperSelect.value : 'ZOM 101';
  const topic = topicSelect ? topicSelect.value : 'General';
  const materialType = materialTypeSelect ? materialTypeSelect.value : 'PDF';
  const title = titleInput ? titleInput.value.trim() : '';
  const description = descInput ? descInput.value.trim() : '';

  if (!uploaderName) {
    const err = new Error("Student Name / Roll Number is required.");
    console.error(err);
    alert(err.message);
    uploaderNameInput?.focus();
    return;
  }

  if (!title) {
    const err = new Error("Resource Title is required.");
    console.error(err);
    alert(err.message);
    titleInput?.focus();
    return;
  }

  const selectedFile = (fileInput && fileInput.files && fileInput.files[0]) 
    ? fileInput.files[0] 
    : (window.uploadedFileObj || null);

  if (!selectedFile) {
    const err = new Error("Please select a file to upload (PDF, PPT, DOCX, or Image).");
    console.error(err);
    alert(err.message);
    return;
  }

  // 1. Validation (Allowed extensions, Max 25 MB)
  try {
    validateFile(selectedFile);
  } catch (validationError) {
    setUploadStatusUI('failed', validationError.message);
    return;
  }

  // 2. Generate destination path in Supabase Storage
  // Format: semester-1/ZOM101/1726318822_Biochemistry.pdf
  const filePath = generateStoragePath(semester, subject, selectedFile.name);
  const bucketName = window.SUPABASE_STORAGE_BUCKET || 'study-materials';

  // 3. Upload directly to Supabase Storage
  setUploadStatusUI('uploading', `Uploading ${selectedFile.name} to "${bucketName}" storage...`);

  try {
    // Enforce MIME type, upload to Supabase Storage
    const mimeType = selectedFile.type || 'application/pdf';
    const { data: storageUploadData, error: storageError } = await client.storage
      .from(bucketName)
      .upload(filePath, selectedFile, {
        contentType: mimeType,
        upsert: false
      });

    if (storageError) {
      console.error('[Supabase Storage Upload Error]:', storageError);
      alert('Storage upload failed: ' + storageError.message);
      setUploadStatusUI('failed', storageError.message);
      return;
    }

    // 4. Retrieve Public URL from Supabase Storage
    const { data: publicUrlData } = client.storage
      .from(bucketName)
      .getPublicUrl(filePath);

    const publicUrl = publicUrlData ? publicUrlData.publicUrl : '';

    if (!publicUrl) {
      const urlErr = new Error("Unable to obtain public download URL from Supabase Storage.");
      console.error(urlErr);
      alert(urlErr.message);
      setUploadStatusUI('failed', urlErr.message);
      return;
    }

    // 5. Prepare Metadata Payload
    // CRITICAL: Only write columns that strictly exist in the Supabase 'materials' table schema cache.
    // Columns that do NOT exist: 'subject', 'uploader_name', 'file_path', 'file_size', 'file_type', 'public_url'.
    // Canonical existing columns: 'id', 'title', 'paper', 'semester', 'topic', 'type', 'student', 'date', 'description', 'file', 'image', 'views', 'likes'.
    const isImageFile = selectedFile.type.startsWith('image/') || 
      /\.(jpg|jpeg|png|webp)$/i.test(selectedFile.name);

    const createdIso = new Date().toISOString();
    const todayDate = createdIso.split('T')[0];
    const generatedId = (typeof crypto !== 'undefined' && crypto.randomUUID) 
      ? crypto.randomUUID() 
      : 'mat_' + Date.now();

    const insertPayload = {
      id: generatedId,
      title: title,
      paper: subject,        // Canonical column for paper code (e.g. "ZOM 101")
      semester: semester,    // e.g. "sem1"
      topic: topic,          // e.g. "Fish Morphology", "Protozoa"
      type: materialType,    // e.g. "PDF", "Class Notes"
      student: uploaderName, // Canonical column for scholar name
      date: todayDate,       // e.g. "2026-09-14"
      description: description,
      file: publicUrl,       // Canonical column storing public URL
      image: isImageFile ? publicUrl : '',
      views: 0,
      likes: 0
    };

    setUploadStatusUI('uploading', 'Saving metadata in materials database...');

    // 6. Execute Supabase Insert with PGRST204 Schema Cache auto-recovery
    let payloadToInsert = { ...insertPayload };
    let insertError = null;
    let insertSuccess = false;

    for (let attempt = 0; attempt < 3; attempt++) {
      const { data: insertData, error: err } = await client
        .from(window.SUPABASE_MATERIALS_TABLE || 'materials')
        .insert([payloadToInsert]);

      if (!err) {
        insertSuccess = true;
        insertError = null;
        break;
      }

      insertError = err;

      // Check if error is PGRST204: column not found in schema cache
      const unmappedColMatch = err.message && err.message.match(/Could not find the '([^']+)' column/i);
      if (unmappedColMatch && unmappedColMatch[1] && payloadToInsert[unmappedColMatch[1]] !== undefined) {
        console.warn(`[Supabase Upload] Removing column "${unmappedColMatch[1]}" from payload (not in schema cache) and retrying...`);
        delete payloadToInsert[unmappedColMatch[1]];
        continue;
      }

      // Non-recoverable error
      break;
    }

    if (!insertSuccess && insertError) {
      console.error('[Supabase Insert Error]:', insertError);
      alert('Database Insert Failed: ' + insertError.message);
      setUploadStatusUI('failed', `Database Insert Failed: ${insertError.message}`);
      return;
    }

    // 7. Success Handling & Bookshelf State Update
    setUploadStatusUI('success', `"${title}" is published and live on the bookshelf!`);
    if (typeof showToast === 'function') {
      showToast(`✓ Material uploaded & published to ${topic}!`);
    }

    // Prepare full normalized representation for in-memory bookshelf UI
    const frontendRecord = {
      id: generatedId,
      title: title,
      paper: subject,
      subject: subject,
      semester: semester,
      topic: topic,
      type: materialType,
      file_type: materialType,
      student: uploaderName,
      uploader_name: uploaderName,
      date: todayDate,
      description: description,
      file: publicUrl,
      public_url: publicUrl,
      image: isImageFile ? publicUrl : '',
      views: 0,
      likes: 0,
      created_at: createdIso
    };

    // Immediately push to active website materials list and re-render
    if (Array.isArray(window.allMaterials)) {
      window.allMaterials.unshift(frontendRecord);
    }
    if (Array.isArray(window.userMaterials)) {
      window.userMaterials.unshift(frontendRecord);
      if (typeof saveUserMaterials === 'function') {
        saveUserMaterials();
      }
    }

    if (typeof rerenderShelves === 'function') {
      rerenderShelves();
    }

    if (typeof updateStatsDashboard === 'function') {
      updateStatsDashboard();
    }

    // Clean up modal state
    window.uploadedFileObj = null;
    const dropzoneLabel = document.getElementById('dropzone-label');
    if (dropzoneLabel) {
      dropzoneLabel.textContent = "📁 Click to select PDF document or specimen photo";
    }

    // Smoothly close modal after short delay
    setTimeout(() => {
      if (typeof closeUploadModal === 'function') {
        closeUploadModal();
      }
      setUploadStatusUI('idle');
      const uploadForm = document.getElementById('student-upload-form');
      if (uploadForm) uploadForm.reset();

      // Scroll to semester
      const targetSec = document.getElementById(semester);
      if (targetSec) {
        targetSec.scrollIntoView({ behavior: 'smooth' });
      }
    }, 1200);

  } catch (unhandledErr) {
    console.error('[Unhandled Upload Error]:', unhandledErr);
    alert(unhandledErr.message || 'An unhandled error occurred during upload.');
    setUploadStatusUI('failed', unhandledErr.message);
  }
}

// Attach to window for global access
if (typeof window !== 'undefined') {
  window.validateFile = validateFile;
  window.generateStoragePath = generateStoragePath;
  window.handleStudyMaterialUpload = handleStudyMaterialUpload;
}
