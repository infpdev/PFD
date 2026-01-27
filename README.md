# EPF Form Processing System

This application was built to simplify and streamline EPF (Form-11 & 2) processing during my internship at Bosch.

The goal was to reduce repetitive manual work, minimize data entry errors, and ensure that all generated documents remain consistent and easy to correct, even after verification.

---

## Why this tool was created

During EPF onboarding, the same employee information is often:
- entered multiple times,
- verified manually,
- corrected across different documents (PDFs, Excel, etc.).

This process is:
- time-consuming,
- error-prone,
- difficult to correct once documents are generated.

This system was created to:
- centralize employee data,
- generate all required outputs programmatically,
- allow corrections without restarting the entire process.

---

## Where this was built

This project was developed as part of my **internship at Bosch**, for internal HR process automation and learning purposes.

> Note: Since corporate systems may restrict external executables, usage may require IT approval depending on the environment.

---

## What the application does

- Collects employee and EPF-related details
- Treats structured JSON data as a **single source of truth**
- Generates:
  - EPF Form-11 and Form-2 PDF documents, along with KYC documents with embedded signatures
  - Excel summary sheets
- Allows controlled corrections by editing stored data
- Regenerates documents without repeating onboarding
- Optionally supports email delivery of generated files

---

## How to use the application

### 1. Launching the application

- [`Download`](https://github.com/jnandevupadhya/PFD/releases/latest/download/PF_Server.exe) and run **`PF_Server.exe`**
- A browser window opens the admin page automatically
- The **local page URL** is also displayed on the screen for reference

No installation or setup is required beyond running the executable.

---

### 2. Admin / Control page

The admin page allows you to:

- View the application URL
- Access the data entry form with the edit option enabled
- View and change submission password
- Generate the Excel summary

---

### 3. Data Entry Form

The form is used to enter employee EPF details such as:
- Personal information
- Bank details
- Nominee details
- Previous employment (if applicable)
- International worker details (if applicable)
- Signature

Mandatory fields are validated to prevent incomplete submissions. Entered data persists across page refreshes, allowing users to continue without losing previously entered information.

---

### 4. Submission & Document Generation

Once the form is submitted:
- Employee data is stored in a structured format
- EPF Form-11 and Form-2 PDF is generated automatically and stored on host device
- Generated PDF is displayed, in order to verify the entered details
- Excel summary file is generated from the same data
- All outputs remain synchronized

---

### 5. Handling corrections

If an error is discovered after submission:
- The stored data can be loaded back to the digital form and corrected
- Documents can be regenerated from the corrected data
- Manual editing of PDFs or Excel files is not required

This avoids inconsistencies between documents.

---

### 6. Configuration file (config.ini)

The application uses a simple configuration file to control email behavior and default document settings.
The file will be generated automatically on first submission, in case it was deleted or did not exist.
All fields are optional unless email sending is enabled.

### [mail] section

This section controls email-related behavior.

- **send_mail**  
  Enables or disables email sending.  
  Set to `True` to send generated documents by email, or `False` to disable mailing completely.

- **smtp_host**  
  SMTP server address used to send emails.  
  In most cases, this does not need to be changed.

- **smtp_port**  
  SMTP server port number.  
  In most cases, this does not need to be changed.

- **email**  
  Sender email address.  
  If this is changed, a corresponding app password must be generated and updated.

- **app_password**  
  App-specific password for the sender email account.  
  This must be generated from the email provider (for Gmail: Google App Passwords).  
  The normal email password should not be used.

- **email_to**  
  Recipient email address where generated files will be sent.

- **email_subject**  
  Subject line of the email.

- **email_body**  
  Body text of the email.  
  Basic employee details such as name and UAN are appended automatically.


### [defaults] section

This section controls default values applied to all generated documents.

- **company_name**  
  Company name printed at the top-right of the generated PDF documents by default.

---

## Folder & file behavior

- Generated documents are stored in the same folder as ``PF_Server.exe``
- Logs are maintained for internal tracking
- Configuration files are included to configure dynamic variables

---

## Limitations & notes

- Designed primarily for internal use (Backend uses host PC / Laptop for privacy)
- Executable may be blocked on secured corporate systems
- Not intended as a public or hosted service
- Final verification of documents is still required as per organizational policy

---

## Technologies used (high level)

- Python
- FastAPI
- ReportLab (PDF generation)
- Pandas (Excel generation)

---

## Closing note

This tool was created to explore **practical system design**, **automation**, and **data consistency** in a real-world workflow.

It reflects a learning-focused approach to building maintainable internal tools rather than a production SaaS product.
