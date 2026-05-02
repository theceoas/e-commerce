// Brand colors
const Y = "#FFDC00"      // yellow accent
const BK = "#0a0a0a"     // near-black
const GY = "#6b6b6b"     // gray text
const LG = "#f5f5f5"     // light gray bg
const SITE = "https://favoritethingslifestyle.com"

interface OrderItem {
  name: string
  quantity: number
  size?: string
  unit_price: number
  total_price: number
  thumbnail_url?: string
}

interface OrderEmailData {
  orderNumber: string
  customerName: string
  customerEmail: string
  items: OrderItem[]
  subtotal: number
  shippingCost: number
  total: number
  shippingAddress: {
    address_line_1: string
    address_line_2?: string
    city: string
    state: string
    country: string
    phone?: string
  }
}

function baseLayout(title: string, previewText: string, body: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>${title}</title>
<!--[if mso]><noscript><xml><o:OfficeDocumentSettings><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings></xml></noscript><![endif]-->
</head>
<body style="margin:0;padding:0;background-color:${LG};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
<span style="display:none;max-height:0;overflow:hidden;">${previewText}</span>

<table width="100%" cellpadding="0" cellspacing="0" style="background-color:${LG};padding:40px 16px;">
  <tr>
    <td align="center">
      <table width="100%" style="max-width:600px;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 16px rgba(0,0,0,0.08);">

        <!-- Header -->
        <tr>
          <td style="background:${BK};padding:28px 40px;text-align:center;">
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td align="center">
                  <div style="display:inline-flex;align-items:center;gap:10px;">
                    <span style="background:${Y};color:${BK};font-weight:800;font-size:15px;padding:6px 12px;border-radius:6px;letter-spacing:0.5px;">FT</span>
                    <span style="color:#ffffff;font-size:18px;font-weight:700;letter-spacing:0.5px;">Favorite Things Lifestyle</span>
                  </div>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- Body -->
        ${body}

        <!-- Footer -->
        <tr>
          <td style="background:${BK};padding:28px 40px;text-align:center;">
            <a href="${SITE}" style="display:inline-block;background:${Y};color:${BK};font-size:13px;font-weight:700;padding:11px 28px;border-radius:8px;text-decoration:none;margin-bottom:20px;letter-spacing:0.3px;">
              Continue Shopping
            </a>
            <p style="margin:0 0 8px;color:#aaa;font-size:12px;line-height:1.6;">
              Questions? DM us on Instagram
              <a href="https://www.instagram.com/favoritethingsngr/" style="color:${Y};text-decoration:none;font-weight:600;">@favoritethingsngr</a>
            </p>
            <p style="margin:0;color:#888;font-size:12px;line-height:1.6;">
              You received this email because you placed an order with Favorite Things Lifestyle.
            </p>
            <p style="margin:8px 0 0;color:#555;font-size:12px;">
              &copy; ${new Date().getFullYear()} Favorite Things Lifestyle. All rights reserved.
            </p>
          </td>
        </tr>

      </table>
    </td>
  </tr>
</table>
</body>
</html>`
}

function itemsTable(items: OrderItem[]): string {
  const rows = items.map(item => `
    <tr>
      <td style="padding:12px 0;border-bottom:1px solid #f0f0f0;">
        <table width="100%" cellpadding="0" cellspacing="0">
          <tr>
            ${item.thumbnail_url ? `
            <td style="vertical-align:top;width:56px;padding-right:12px;">
              <img src="${item.thumbnail_url}" width="48" height="48" alt="${item.name}" style="border-radius:6px;object-fit:cover;display:block;width:48px;height:48px;" />
            </td>` : `
            <td style="vertical-align:top;width:56px;padding-right:12px;">
              <div style="width:48px;height:48px;background:#f0f0f0;border-radius:6px;"></div>
            </td>`}
            <td style="vertical-align:top;">
              <p style="margin:0;font-size:14px;font-weight:600;color:${BK};">${item.name}</p>
              <p style="margin:2px 0 0;font-size:12px;color:${GY};">
                Qty: ${item.quantity}${item.size ? ` &middot; Size: ${item.size}` : ""}
              </p>
            </td>
            <td style="vertical-align:top;text-align:right;white-space:nowrap;">
              <p style="margin:0;font-size:14px;font-weight:600;color:${BK};">&#8358;${item.total_price.toLocaleString()}</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>`).join("")

  return `<table width="100%" cellpadding="0" cellspacing="0">${rows}</table>`
}

function totalsBlock(data: OrderEmailData): string {
  return `
    <table width="100%" cellpadding="0" cellspacing="0" style="margin-top:16px;">
      <tr>
        <td style="padding:6px 0;font-size:13px;color:${GY};">Subtotal</td>
        <td style="padding:6px 0;font-size:13px;color:${BK};text-align:right;">&#8358;${data.subtotal.toLocaleString()}</td>
      </tr>
      <tr>
        <td style="padding:6px 0;font-size:13px;color:${GY};">Shipping</td>
        <td style="padding:6px 0;font-size:13px;color:${BK};text-align:right;">&#8358;${data.shippingCost.toLocaleString()}</td>
      </tr>
      <tr>
        <td style="padding:12px 0 0;font-size:15px;font-weight:700;color:${BK};border-top:2px solid ${BK};">Total</td>
        <td style="padding:12px 0 0;font-size:15px;font-weight:700;color:${BK};text-align:right;border-top:2px solid ${BK};">&#8358;${data.total.toLocaleString()}</td>
      </tr>
    </table>`
}

function addressBlock(data: OrderEmailData): string {
  const a = data.shippingAddress
  return `
    <tr>
      <td style="padding:0 40px 32px;">
        <h3 style="margin:0 0 12px;font-size:13px;font-weight:700;color:${BK};text-transform:uppercase;letter-spacing:0.8px;">Shipping Address</h3>
        <p style="margin:0;font-size:13px;color:${GY};line-height:1.7;">
          ${a.address_line_1}${a.address_line_2 ? "<br>" + a.address_line_2 : ""}<br>
          ${a.city}, ${a.state}<br>
          ${a.country}
          ${a.phone ? "<br>Tel: " + a.phone : ""}
        </p>
      </td>
    </tr>`
}

// ── 1. Order Confirmation ────────────────────────────────────────────────────

export function orderConfirmationEmail(data: OrderEmailData): { subject: string; html: string } {
  const subject = `Order Confirmed ✓ — #${data.orderNumber}`

  const body = `
    <!-- Yellow accent bar -->
    <tr><td style="background:${Y};height:4px;"></td></tr>

    <!-- Hero -->
    <tr>
      <td style="padding:40px 40px 32px;text-align:center;">
        <div style="width:60px;height:60px;background:${Y};border-radius:50%;display:inline-flex;align-items:center;justify-content:center;margin-bottom:20px;">
          <span style="font-size:28px;">✓</span>
        </div>
        <h1 style="margin:0 0 8px;font-size:24px;font-weight:800;color:${BK};">Order Confirmed!</h1>
        <p style="margin:0;font-size:15px;color:${GY};">Hey ${data.customerName}, your order is confirmed and being processed.</p>
      </td>
    </tr>

    <!-- Order number badge -->
    <tr>
      <td style="padding:0 40px 32px;text-align:center;">
        <div style="display:inline-block;background:${LG};border:1px solid #e0e0e0;border-radius:8px;padding:12px 24px;">
          <p style="margin:0;font-size:11px;color:${GY};text-transform:uppercase;letter-spacing:0.8px;">Order Number</p>
          <p style="margin:4px 0 0;font-size:20px;font-weight:800;color:${BK};letter-spacing:1px;">#${data.orderNumber}</p>
        </div>
      </td>
    </tr>

    <!-- Items -->
    <tr>
      <td style="padding:0 40px 24px;">
        <h3 style="margin:0 0 16px;font-size:13px;font-weight:700;color:${BK};text-transform:uppercase;letter-spacing:0.8px;">Your Items</h3>
        ${itemsTable(data.items)}
        ${totalsBlock(data)}
      </td>
    </tr>

    ${addressBlock(data)}

    <!-- What's next -->
    <tr>
      <td style="padding:0 40px 40px;">
        <div style="background:${LG};border-radius:10px;padding:20px 24px;">
          <h3 style="margin:0 0 12px;font-size:13px;font-weight:700;color:${BK};">What happens next?</h3>
          <table width="100%" cellpadding="0" cellspacing="0">
            <tr>
              <td style="padding:6px 0;font-size:13px;color:${GY};">
                <span style="display:inline-block;width:20px;height:20px;background:${Y};border-radius:50%;text-align:center;line-height:20px;font-size:11px;font-weight:700;color:${BK};margin-right:8px;">1</span>
                We're preparing your order
              </td>
            </tr>
            <tr>
              <td style="padding:6px 0;font-size:13px;color:${GY};">
                <span style="display:inline-block;width:20px;height:20px;background:${LG};border:1px solid #ddd;border-radius:50%;text-align:center;line-height:20px;font-size:11px;font-weight:700;color:${GY};margin-right:8px;">2</span>
                You'll get an email when it's out for delivery
              </td>
            </tr>
            <tr>
              <td style="padding:6px 0;font-size:13px;color:${GY};">
                <span style="display:inline-block;width:20px;height:20px;background:${LG};border:1px solid #ddd;border-radius:50%;text-align:center;line-height:20px;font-size:11px;font-weight:700;color:${GY};margin-right:8px;">3</span>
                Another email when it's delivered
              </td>
            </tr>
          </table>
        </div>
      </td>
    </tr>`

  return { subject, html: baseLayout("Order Confirmed — Favorite Things Lifestyle", `Your order #${data.orderNumber} is confirmed!`, body) }
}

// ── 2. Out for Delivery ──────────────────────────────────────────────────────

export function outForDeliveryEmail(data: OrderEmailData): { subject: string; html: string } {
  const subject = `Your order is out for delivery 🚚 — #${data.orderNumber}`

  const body = `
    <tr><td style="background:${Y};height:4px;"></td></tr>

    <tr>
      <td style="padding:40px 40px 32px;text-align:center;">
        <div style="font-size:52px;margin-bottom:16px;">🚚</div>
        <h1 style="margin:0 0 8px;font-size:24px;font-weight:800;color:${BK};">It's on its way!</h1>
        <p style="margin:0;font-size:15px;color:${GY};">Hey ${data.customerName}, your order is out for delivery today.</p>
      </td>
    </tr>

    <tr>
      <td style="padding:0 40px 32px;text-align:center;">
        <div style="display:inline-block;background:${Y};border-radius:8px;padding:12px 24px;">
          <p style="margin:0;font-size:11px;color:${BK};text-transform:uppercase;letter-spacing:0.8px;font-weight:600;">Order</p>
          <p style="margin:4px 0 0;font-size:20px;font-weight:800;color:${BK};">#${data.orderNumber}</p>
        </div>
      </td>
    </tr>

    <tr>
      <td style="padding:0 40px 24px;">
        <h3 style="margin:0 0 16px;font-size:13px;font-weight:700;color:${BK};text-transform:uppercase;letter-spacing:0.8px;">Your Items</h3>
        ${itemsTable(data.items)}
      </td>
    </tr>

    ${addressBlock(data)}

    <tr>
      <td style="padding:0 40px 40px;">
        <div style="background:${LG};border-radius:10px;padding:20px 24px;text-align:center;">
          <p style="margin:0;font-size:14px;color:${GY};line-height:1.6;">
            Please make sure someone is available to receive the package.<br>
            Questions? Text us on Instagram
            <a href="https://www.instagram.com/favoritethingsngr/" style="color:${BK};font-weight:700;text-decoration:none;">@favoritethingsngr</a>
          </p>
        </div>
      </td>
    </tr>`

  return { subject, html: baseLayout("Out for Delivery — Favorite Things Lifestyle", `Your order #${data.orderNumber} is on its way!`, body) }
}

// ── 3. Delivered ─────────────────────────────────────────────────────────────

export function deliveredEmail(data: OrderEmailData): { subject: string; html: string } {
  const subject = `Your order has been delivered 🎉 — #${data.orderNumber}`

  const body = `
    <tr><td style="background:${Y};height:4px;"></td></tr>

    <tr>
      <td style="padding:40px 40px 32px;text-align:center;">
        <div style="font-size:52px;margin-bottom:16px;">🎉</div>
        <h1 style="margin:0 0 8px;font-size:24px;font-weight:800;color:${BK};">Delivered!</h1>
        <p style="margin:0;font-size:15px;color:${GY};">Hey ${data.customerName}, your order has been delivered. Enjoy!</p>
      </td>
    </tr>

    <tr>
      <td style="padding:0 40px 24px;">
        <h3 style="margin:0 0 16px;font-size:13px;font-weight:700;color:${BK};text-transform:uppercase;letter-spacing:0.8px;">What you received</h3>
        ${itemsTable(data.items)}
        ${totalsBlock(data)}
      </td>
    </tr>

    <tr>
      <td style="padding:0 40px 40px;">
        <div style="background:${Y};border-radius:10px;padding:24px;text-align:center;">
          <h3 style="margin:0 0 8px;font-size:15px;font-weight:800;color:${BK};">Love what you got?</h3>
          <p style="margin:0 0 16px;font-size:13px;color:${BK};">Share the look, tag us, and shop more.</p>
          <a href="${SITE}" style="display:inline-block;background:${BK};color:#fff;font-size:13px;font-weight:700;padding:12px 28px;border-radius:8px;text-decoration:none;letter-spacing:0.3px;">
            Shop Again
          </a>
        </div>
      </td>
    </tr>`

  return { subject, html: baseLayout("Delivered — Favorite Things Lifestyle", `Your order #${data.orderNumber} has arrived!`, body) }
}

// ── 4. Completed ──────────────────────────────────────────────────────────────

export function orderCompletedEmail(data: OrderEmailData): { subject: string; html: string } {
  const subject = `Thank you for your order 💛 — #${data.orderNumber}`

  const body = `
    <tr><td style="background:${Y};height:4px;"></td></tr>

    <tr>
      <td style="padding:40px 40px 32px;text-align:center;">
        <div style="font-size:52px;margin-bottom:16px;">💛</div>
        <h1 style="margin:0 0 8px;font-size:24px;font-weight:800;color:${BK};">Order Complete!</h1>
        <p style="margin:0;font-size:15px;color:${GY};">Hey ${data.customerName}, your order is all done. Thank you for shopping with us.</p>
      </td>
    </tr>

    <tr>
      <td style="padding:0 40px 32px;text-align:center;">
        <div style="display:inline-block;background:${LG};border:1px solid #e0e0e0;border-radius:8px;padding:12px 24px;">
          <p style="margin:0;font-size:11px;color:${GY};text-transform:uppercase;letter-spacing:0.8px;">Order Number</p>
          <p style="margin:4px 0 0;font-size:20px;font-weight:800;color:${BK};letter-spacing:1px;">#${data.orderNumber}</p>
        </div>
      </td>
    </tr>

    <tr>
      <td style="padding:0 40px 24px;">
        <h3 style="margin:0 0 16px;font-size:13px;font-weight:700;color:${BK};text-transform:uppercase;letter-spacing:0.8px;">What you ordered</h3>
        ${itemsTable(data.items)}
        ${totalsBlock(data)}
      </td>
    </tr>

    <tr>
      <td style="padding:0 40px 40px;">
        <div style="background:${Y};border-radius:10px;padding:24px;text-align:center;">
          <h3 style="margin:0 0 8px;font-size:15px;font-weight:800;color:${BK};">Come back soon 🛍️</h3>
          <p style="margin:0 0 16px;font-size:13px;color:${BK};">New arrivals drop regularly. Don't miss out.</p>
          <a href="${SITE}" style="display:inline-block;background:${BK};color:#fff;font-size:13px;font-weight:700;padding:12px 28px;border-radius:8px;text-decoration:none;letter-spacing:0.3px;">
            Shop New Arrivals
          </a>
        </div>
      </td>
    </tr>`

  return { subject, html: baseLayout("Order Complete — Favorite Things Lifestyle", `Thank you! Order #${data.orderNumber} is complete.`, body) }
}
