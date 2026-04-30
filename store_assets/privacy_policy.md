# Privacy Policy for Mouse Fitness

**Last Updated:** April 2026

Mouse Fitness ("we", "our", or "us") is committed to protecting your privacy. This Privacy Policy explains our practices regarding the collection, use, and disclosure of information when you use the Mouse Fitness Chrome Extension (the "Extension").

## 1. Data Collection & Usage
**We do not collect, transmit, distribute, or sell your data.** 

The Extension is designed to calculate and display the total physical distance your mouse travels while browsing. To achieve this, it temporarily measures your mouse coordinates (`clientX`, `clientY`) as you navigate webpages.

- **All processing happens locally:** The calculation of distance occurs entirely on your own device.
- **No external servers:** The Extension does not connect to any external servers, APIs, or databases to upload or transmit your browsing activity, mouse movements, or personal information.

## 2. Data Storage
All calculated statistics (e.g., total distance traveled, daily activity, hourly activity, and unlocked milestones) are saved locally on your device using the `chrome.storage.local` API. 

This data never leaves your browser and is only used to render the statistics and milestones within the Extension's dashboard.

## 3. Permissions
The Extension requires the following permissions to function:
- `storage`: Required to save your fitness statistics and user preferences (like metric vs. imperial units) locally on your device.
- `host_permissions` (`<all_urls>`): Required to inject the distance-calculating script onto the webpages you visit so that it can measure your mouse movement across the internet.

## 4. Third-Party Access
Because we do not collect any data, we do not share any data with third parties. 

## 5. Changes to This Privacy Policy
We may update our Privacy Policy from time to time. Any changes will be reflected in an updated version of this document.

## 6. Contact Us
If you have any questions about this Privacy Policy, please contact the developer via the support link provided in the Chrome Web Store.
