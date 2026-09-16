const API_BASE_URL =
    "https://knbh4p7bw0.execute-api.us-east-1.amazonaws.com/prod";

async function loadRequests() {

    const table =
        document.getElementById(
            "requestsTable"
        );


    table.innerHTML = `
        <tr>
            <td
                colspan="6"
                class="table-loading"
            >
                Loading requests...
            </td>
        </tr>
    `;


    try {

        const response =
            await fetch(
                `${API_BASE_URL}/admin/requests`
            );


        if (!response.ok) {

            throw new Error(
                "Failed to load requests."
            );

        }


        const result =
            await response.json();


        const requests =
            result.requests ||
            result ||
            [];


        updateStatistics(
            requests
        );


        renderRequests(
            requests
        );


    } catch (error) {

        console.error(error);


        table.innerHTML = `
            <tr>
                <td
                    colspan="6"
                    class="table-loading"
                >
                    Unable to load requests.
                </td>
            </tr>
        `;

    }

}


/* =========================================================
   STATISTICS
   ========================================================= */

function updateStatistics(
    requests
) {

    const total =
        requests.length;


    const pending =
        requests.filter(
            item =>
                String(
                    item.status || "Pending"
                ).toLowerCase() ===
                "pending"
        ).length;


    const approved =
        requests.filter(
            item =>
                String(
                    item.status || ""
                ).toLowerCase() ===
                "approved"
        ).length;


    const rejected =
        requests.filter(
            item =>
                String(
                    item.status || ""
                ).toLowerCase() ===
                "rejected"
        ).length;


    document.getElementById(
        "totalRequests"
    ).textContent = total;


    document.getElementById(
        "pendingRequests"
    ).textContent = pending;


    document.getElementById(
        "approvedRequests"
    ).textContent = approved;


    document.getElementById(
        "rejectedRequests"
    ).textContent = rejected;

}


/* =========================================================
   RENDER REQUESTS
   ========================================================= */

function renderRequests(
    requests
) {

    const table =
        document.getElementById(
            "requestsTable"
        );


    const emptyState =
        document.getElementById(
            "emptyState"
        );


    if (!requests.length) {

        table.innerHTML = "";

        emptyState.style.display =
            "block";

        return;

    }


    emptyState.style.display =
        "none";


    requests.sort(
        function (a, b) {

            return new Date(
                b.created_at || 0
            ) -
            new Date(
                a.created_at || 0
            );

        }
    );


    table.innerHTML =
        requests.map(
            function (request) {

                const status =
                    String(
                        request.status ||
                        "Pending"
                    ).toLowerCase();


                const formattedDate =
                    request.created_at
                        ? new Date(
                            request.created_at
                        ).toLocaleString()
                        : "-";


                const documentName =
                    request.document_key
                        ? request.document_key
                            .split("/")
                            .pop()
                        : "-";


                let actions = `
                    <button
                        class="admin-action view"
                        onclick="viewDocument('${escapeAttribute(
                            request.request_id
                        )}')"
                    >
                        View
                    </button>
                `;


                if (status === "pending") {

                    actions += `

                        <button
                            class="admin-action approve"
                            onclick="makeDecision(
                                '${escapeAttribute(
                                    request.request_id
                                )}',
                                'Approved'
                            )"
                        >
                            Approve
                        </button>


                        <button
                            class="admin-action reject"
                            onclick="makeDecision(
                                '${escapeAttribute(
                                    request.request_id
                                )}',
                                'Rejected'
                            )"
                        >
                            Reject
                        </button>

                    `;

                }


                return `

                    <tr>

                        <td>

                            <strong>
                                ${escapeHTML(
                                    request.name || "-"
                                )}
                            </strong>

                        </td>


                        <td>
                            ${escapeHTML(
                                request.email || "-"
                            )}
                        </td>


                        <td>
                            ${escapeHTML(
                                documentName
                            )}
                        </td>


                        <td>

                            <span
                                class="admin-status-badge ${status}"
                            >
                                ${capitalize(status)}
                            </span>

                        </td>


                        <td>
                            ${formattedDate}
                        </td>


                        <td>

                            <div class="admin-actions">

                                ${actions}

                            </div>

                        </td>

                    </tr>

                `;

            }
        ).join("");

}


/* =========================================================
   VIEW DOCUMENT
   ========================================================= */

async function viewDocument(
    requestId
) {

    try {

        const response =
            await fetch(
                `${API_BASE_URL}/admin/document?request_id=${encodeURIComponent(
                    requestId
                )}`
            );


        if (!response.ok) {

            throw new Error(
                "Unable to retrieve document."
            );

        }


        const result =
            await response.json();


        if (!result.url) {

            throw new Error(
                "Document URL was not returned."
            );

        }


        window.open(
            result.url,
            "_blank"
        );


    } catch (error) {

        console.error(error);


        alert(
            "Unable to open the document."
        );

    }

}


/* =========================================================
   APPROVE / REJECT
   ========================================================= */

async function makeDecision(
    requestId,
    decision
) {

    const action =
        decision === "Approved"
            ? "approve"
            : "reject";


    const confirmed =
        confirm(
            `Are you sure you want to ${action} this document?`
        );


    if (!confirmed) {
        return;
    }


    try {

        const response =
            await fetch(
                `${API_BASE_URL}/admin/decision`,
                {

                    method: "POST",

                    headers: {
                        "Content-Type":
                            "application/json"
                    },

                    body: JSON.stringify({

                        request_id:
                            requestId,

                        decision:
                            decision

                    })

                }
            );


        if (!response.ok) {

            throw new Error(
                "Decision request failed."
            );

        }


        await loadRequests();


    } catch (error) {

        console.error(error);


        alert(
            "Unable to update document status."
        );

    }

}


/* =========================================================
   HELPERS
   ========================================================= */

function capitalize(
    value
) {

    return (
        value.charAt(0).toUpperCase() +
        value.slice(1)
    );

}


function escapeHTML(
    value
) {

    return String(value)
        .replaceAll(
            "&",
            "&amp;"
        )
        .replaceAll(
            "<",
            "&lt;"
        )
        .replaceAll(
            ">",
            "&gt;"
        )
        .replaceAll(
            '"',
            "&quot;"
        )
        .replaceAll(
            "'",
            "&#039;"
        );

}


function escapeAttribute(
    value
) {

    return String(value)
        .replaceAll(
            "\\",
            "\\\\"
        )
        .replaceAll(
            "'",
            "\\'"
        )
        .replaceAll(
            '"',
            '\\"'
        );

}


/* =========================================================
   INITIAL LOAD
   ========================================================= */

document.addEventListener(
    "DOMContentLoaded",
    function () {

        loadRequests();

    }
);