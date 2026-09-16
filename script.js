const API_BASE_URL =
    "https://knbh4p7bw0.execute-api.us-east-1.amazonaws.com/prod";

const form =
    document.getElementById("documentForm");

const fileInput =
    document.getElementById("file");

const fileName =
    document.getElementById("fileName");

const message =
    document.getElementById("message");

const submitBtn =
    document.getElementById("submitBtn");

const uploadBox =
    document.getElementById("uploadBox");


/* =========================================================
   FILE SELECTION
   ========================================================= */

fileInput.addEventListener(
    "change",
    function () {

        if (this.files.length > 0) {

            fileName.textContent =
                `Selected file: ${this.files[0].name}`;

        } else {

            fileName.textContent = "";

        }

    }
);


/* =========================================================
   DRAG & DROP
   ========================================================= */

uploadBox.addEventListener(
    "dragover",
    function (event) {

        event.preventDefault();

        uploadBox.classList.add("dragover");

    }
);


uploadBox.addEventListener(
    "dragleave",
    function () {

        uploadBox.classList.remove("dragover");

    }
);


uploadBox.addEventListener(
    "drop",
    function (event) {

        event.preventDefault();

        uploadBox.classList.remove("dragover");

        if (event.dataTransfer.files.length > 0) {

            fileInput.files =
                event.dataTransfer.files;

            fileName.textContent =
                `Selected file: ${event.dataTransfer.files[0].name}`;

        }

    }
);


/* =========================================================
   SHOW MESSAGE
   ========================================================= */

function showMessage(
    text,
    type
) {

    message.textContent = text;

    message.className =
        `message ${type}`;

}


/* =========================================================
   SUBMIT FORM
   ========================================================= */

form.addEventListener(
    "submit",
    async function (event) {

        event.preventDefault();


        if (!fileInput.files.length) {

            showMessage(
                "Please select a document.",
                "error"
            );

            return;

        }


        const file =
            fileInput.files[0];


        const name =
            document.getElementById("name").value.trim();


        const email =
            document.getElementById("email").value.trim();


        if (!name || !email) {

            showMessage(
                "Please complete all required fields.",
                "error"
            );

            return;

        }


        submitBtn.disabled = true;

        submitBtn.innerHTML = `
            <span>Uploading...</span>
        `;


        try {

            const base64File =
                await fileToBase64(file);


            const response =
                await fetch(
                    `${API_BASE_URL}/submit`,
                    {
                        method: "POST",

                        headers: {
                            "Content-Type":
                                "application/json"
                        },

                        body: JSON.stringify({

                            name: name,

                            email: email,

                            file_name:
                                file.name,

                            file_content:
                                base64File

                        })

                    }
                );


            const result =
                await response.json();


            if (!response.ok) {

                throw new Error(
                    result.message ||
                    result.error ||
                    "Submission failed."
                );

            }


            showMessage(
                "Your document was submitted successfully.",
                "success"
            );


            form.reset();

            fileName.textContent = "";


        } catch (error) {

            console.error(error);


            showMessage(
                error.message ||
                "Something went wrong. Please try again.",
                "error"
            );

        } finally {

            submitBtn.disabled = false;

            submitBtn.innerHTML = `
                <span>Submit Document</span>
                <span class="arrow">→</span>
            `;

        }

    }
);


/* =========================================================
   FILE TO BASE64
   ========================================================= */

function fileToBase64(file) {

    return new Promise(
        function (resolve, reject) {

            const reader =
                new FileReader();


            reader.onload = function () {

                const result =
                    reader.result;


                const base64 =
                    result.split(",")[1];


                resolve(base64);

            };


            reader.onerror = function () {

                reject(
                    new Error(
                        "Unable to read the file."
                    )
                );

            };


            reader.readAsDataURL(file);

        }
    );

}