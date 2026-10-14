function invoiceCurrency(amount) {
  return `${Number(amount).toLocaleString('vi-VN')}đ`;
}

function escapeInvoiceText(value) {
  return String(value).replace(/[&<>"']/g, (character) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  })[character]);
}

document.addEventListener('DOMContentLoaded', async () => {
  window.renderTopbar('Quản lý hóa đơn', 'Theo dõi hóa đơn, tiền thanh toán và trạng thái');
  window.OngVangApp?.setActiveNav?.('quanlyhoadon');

  const tbody = document.querySelector('tbody');
  const searchInput = document.querySelector('input[type="text"]');
  const statusFilter = document.querySelector('select');
  let invoices = window.OngVangApp.readCollection('ongvang_invoices');
  let filteredInvoices = invoices;
  const invoicePageSize = 9;
  let currentInvoicePage = 1;

  try {
    invoices = await window.OngVangApp.loadInvoices();
    filteredInvoices = invoices;
  } catch (error) {
    window.OngVangApp?.showToast?.('Không thể tải hóa đơn từ máy chủ.', 'warning');
  }

  const renderInvoices = () => {
    const term = (searchInput?.value || '').trim().toLowerCase();
    const filterValue = statusFilter?.value || 'Tất cả';
    const filtered = invoices.filter((invoice) => {
      const searchable = `${invoice.id} ${invoice.customer} ${invoice.employee} ${invoice.table || ''}`.toLowerCase();
      return (!term || searchable.includes(term)) && (filterValue === 'Tất cả' || invoice.status === filterValue);
    });
    filteredInvoices = filtered;

    if (!tbody) return;
    const pageCount = Math.max(1, Math.ceil(filtered.length / invoicePageSize));
    currentInvoicePage = Math.min(currentInvoicePage, pageCount);
    const firstInvoiceIndex = (currentInvoicePage - 1) * invoicePageSize;
    tbody.innerHTML = filtered.length
      ? filtered.slice(firstInvoiceIndex, firstInvoiceIndex + invoicePageSize).map((invoice) => {
          const statusClass = invoice.status === 'Đã thanh toán' ? 'success' : invoice.status === 'Hủy' ? 'warning' : 'info';
          return `
            <tr>
              <td>${escapeInvoiceText(invoice.id)}</td>
              <td>${escapeInvoiceText(invoice.customer)}</td>
              <td>${escapeInvoiceText(invoice.date)}</td>
              <td>${escapeInvoiceText(invoice.employee || 'NV-01')}</td>
              <td>${invoiceCurrency(invoice.total)}</td>
              <td><span class="tag ${statusClass}">${escapeInvoiceText(invoice.status)}</span></td>
              <td class="invoice-actions">
                <button class="invoice-detail-btn" type="button" data-invoice-index="${invoices.indexOf(invoice)}">Chi tiết</button>
                ${invoice.status === 'Chờ thanh toán' ? `<button class="invoice-pay-btn" type="button" data-pay-invoice-index="${invoices.indexOf(invoice)}">Thanh toán</button>` : ''}
                ${invoice.status === 'Chờ thanh toán' ? `<button class="invoice-cancel-btn" type="button" data-cancel-invoice-index="${invoices.indexOf(invoice)}">Hủy</button>` : ''}
              </td>
            </tr>
          `;
        }).join('')
      : '<tr><td colspan="7" style="text-align:center; color:var(--muted); padding:1.5rem;">Không tìm thấy hóa đơn phù hợp.</td></tr>';

    const pagination = document.querySelector('#invoicePagination');
    if (!pagination) return;
    pagination.innerHTML = pageCount > 1 ? `
      <button type="button" data-invoice-page="${currentInvoicePage - 1}" ${currentInvoicePage === 1 ? 'disabled' : ''}>Trước</button>
      ${Array.from({ length: pageCount }, (_, index) => {
        const page = index + 1;
        return `<button type="button" data-invoice-page="${page}" ${page === currentInvoicePage ? 'aria-current="page"' : ''}>${page}</button>`;
      }).join('')}
      <button type="button" data-invoice-page="${currentInvoicePage + 1}" ${currentInvoicePage === pageCount ? 'disabled' : ''}>Tiếp</button>
    ` : '';
  };

  const renderInvoiceSummary = () => {
    const paidInvoices = invoices.filter((invoice) => invoice.status === 'Đã thanh toán');
    document.querySelector('#invoiceCount').textContent = invoices.length;
    document.querySelector('#paidInvoiceCount').textContent = paidInvoices.length;
    document.querySelector('#pendingInvoiceCount').textContent = invoices.filter((invoice) => ['Chờ thanh toán', 'Đang phục vụ'].includes(invoice.status)).length;
    document.querySelector('#paidRevenue').textContent = invoiceCurrency(paidInvoices.reduce((sum, invoice) => sum + Number(invoice.total || 0), 0));
  };

  const refreshInvoices = (latestInvoices) => {
    invoices = latestInvoices;
    renderInvoiceSummary();
    renderInvoices();
  };

  window.OngVangApp.subscribeCollection('ongvang_invoices', refreshInvoices);

  searchInput?.addEventListener('input', () => {
    currentInvoicePage = 1;
    renderInvoices();
  });
  statusFilter?.addEventListener('change', () => {
    currentInvoicePage = 1;
    renderInvoices();
  });
  document.querySelector('#invoicePagination')?.addEventListener('click', (event) => {
    const button = event.target.closest('[data-invoice-page]');
    if (!button || button.disabled) return;
    currentInvoicePage = Number(button.dataset.invoicePage);
    renderInvoices();
  });
  document.querySelector('#exportInvoices')?.addEventListener('click', () => {
    const columns = ['Mã hóa đơn', 'Khách hàng', 'Bàn', 'Ngày', 'Nhân viên', 'Tạm tính', 'Voucher', 'Giảm giá', 'Tổng tiền', 'Trạng thái'];
    const rows = filteredInvoices.map((invoice) => [invoice.id, invoice.customer, invoice.table || '', invoice.date, invoice.employee || 'NV-01', invoice.subtotal ?? invoice.total, invoice.voucherCode || '', invoice.discount || 0, invoice.total, invoice.status]);
    const csvCell = (value) => `"${String(value ?? '').replace(/"/g, '""')}"`;
    const csv = [columns, ...rows].map((row) => row.map(csvCell).join(',')).join('\r\n');
    const url = URL.createObjectURL(new Blob(['\ufeff', csv], { type: 'text/csv;charset=utf-8' }));
    const download = document.createElement('a');
    download.href = url;
    download.download = 'ongvang-invoices.csv';
    download.click();
    URL.revokeObjectURL(url);
    window.OngVangApp?.showToast?.(`Đã xuất ${filteredInvoices.length} hóa đơn.`, 'success');
  });
  tbody?.addEventListener('click', (event) => {
    const cancelButton = event.target.closest('[data-cancel-invoice-index]');
    if (cancelButton) {
      const invoice = invoices[Number(cancelButton.dataset.cancelInvoiceIndex)];
      if (invoice) openCancelConfirmation(invoice);
      return;
    }
    const payButton = event.target.closest('[data-pay-invoice-index]');
    if (payButton) {
      const invoice = invoices[Number(payButton.dataset.payInvoiceIndex)];
      if (invoice) openPaymentConfirmation(invoice);
      return;
    }
    const button = event.target.closest('[data-invoice-index]');
    if (!button) return;
    const invoice = invoices[Number(button.dataset.invoiceIndex)];
    if (!invoice) return;

    const items = invoice.items?.length
      ? invoice.items.map((item) => `<li>${escapeInvoiceText(item.name)} x${item.qty} <strong>${invoiceCurrency(item.qty * item.price)}</strong></li>`).join('')
      : '<li>Không có chi tiết món.</li>';
    const content = `
      <p><strong>Khách hàng:</strong> ${escapeInvoiceText(invoice.customer)}</p>
      <p><strong>Bàn:</strong> ${escapeInvoiceText(invoice.table || 'Chưa ghi nhận')}</p>
      <p><strong>Ngày:</strong> ${escapeInvoiceText(invoice.date)}</p>
      <p><strong>Trạng thái:</strong> ${escapeInvoiceText(invoice.status)}</p>
      <p><strong>Phương thức:</strong> ${escapeInvoiceText(invoice.paymentMethod || 'Chưa chọn')}</p>
      <p><strong>Tạm tính:</strong> ${invoiceCurrency(invoice.subtotal ?? invoice.total)}</p>
      ${invoice.voucherCode ? `<p><strong>Voucher:</strong> ${escapeInvoiceText(invoice.voucherCode)} · giảm ${invoiceCurrency(invoice.discount)}</p>` : ''}
      <ul>${items}</ul>
      <p><strong>Tổng cộng:</strong> ${invoiceCurrency(invoice.total)}</p>
    `;
    const actions = [{ label: 'Đóng', type: 'secondary' }];
    if (invoice.status === 'Chờ thanh toán') actions.unshift({ label: 'Thanh toán', type: 'primary' });
    if (invoice.status === 'Chờ thanh toán') actions.unshift({ label: 'Hủy hóa đơn', type: 'secondary' });
    window.OngVangApp?.openModal?.(`Hóa đơn ${escapeInvoiceText(invoice.id)}`, content, actions);
    const modal = document.querySelector('#app-modal');
    modal?.querySelector('[data-modal-action="Đóng"]')?.addEventListener('click', () => { modal.innerHTML = ''; });
    modal?.querySelector('[data-modal-action="Thanh toán"]')?.addEventListener('click', () => openPaymentConfirmation(invoice));
    modal?.querySelector('[data-modal-action="Hủy hóa đơn"]')?.addEventListener('click', () => openCancelConfirmation(invoice));
  });

  function openCancelConfirmation(invoice) {
    if (invoice.status !== 'Chờ thanh toán') return;
    const content = `
      <p>Bạn có chắc muốn hủy hóa đơn <strong>${escapeInvoiceText(invoice.invoiceCode || invoice.id)}</strong>?</p>
      <p>Tổng tiền: <strong>${invoiceCurrency(invoice.total)}</strong></p>
    `;
    window.OngVangApp?.openModal?.('Xác nhận hủy hóa đơn', content, [
      { label: 'Quay lại', type: 'secondary' },
      { label: 'Xác nhận hủy', type: 'primary' }
    ]);
    const modal = document.querySelector('#app-modal');
    modal?.querySelector('[data-modal-action="Quay lại"]')?.addEventListener('click', () => { modal.innerHTML = ''; });
    modal?.querySelector('[data-modal-action="Xác nhận hủy"]')?.addEventListener('click', async (event) => {
      const button = event.currentTarget;
      if (button.disabled) return;
      button.disabled = true;
      button.textContent = 'Đang hủy...';
      try {
        await window.OngVangApp.apiRequest(`/api/invoices/${encodeURIComponent(invoice.invoiceCode || invoice.id)}`, {
          method: 'PUT',
          body: { status: 'cancelled' }
        });
        const latestInvoices = await window.OngVangApp.loadInvoices();
        refreshInvoices(latestInvoices);
        modal.innerHTML = '';
        window.OngVangApp?.showToast?.('Đã hủy hóa đơn đang chờ thanh toán.', 'success');
      } catch (error) {
        button.disabled = false;
        button.textContent = 'Xác nhận hủy';
        window.OngVangApp?.showToast?.(error.message || 'Không thể hủy hóa đơn.', 'error');
      }
    });
  }

  function openPaymentConfirmation(invoice) {
    if (invoice.status !== 'Chờ thanh toán') return;
    const methods = ['Tiền mặt', 'Chuyển khoản', 'Thẻ'];
    const options = methods.map((method) => `<option value="${method}" ${invoice.paymentMethod === method ? 'selected' : ''}>${method}</option>`).join('');
    const content = `
      <p>Xác nhận thu <strong>${invoiceCurrency(invoice.total)}</strong> cho hóa đơn <strong>${escapeInvoiceText(invoice.invoiceCode || invoice.id)}</strong>.</p>
      <label class="form-group">Phương thức thanh toán<select class="form-control" id="invoicePaymentMethod">${options}</select></label>
    `;
    window.OngVangApp?.openModal?.('Xác nhận thanh toán', content, [
      { label: 'Hủy', type: 'secondary' },
      { label: 'Xác nhận thanh toán', type: 'primary' }
    ]);
    const modal = document.querySelector('#app-modal');
    modal?.querySelector('[data-modal-action="Hủy"]')?.addEventListener('click', () => { modal.innerHTML = ''; });
    modal?.querySelector('[data-modal-action="Xác nhận thanh toán"]')?.addEventListener('click', async (event) => {
      const button = event.currentTarget;
      if (button.disabled) return;
      button.disabled = true;
      button.textContent = 'Đang lưu...';
      try {
        await window.OngVangApp.apiRequest(`/api/invoices/${encodeURIComponent(invoice.invoiceCode || invoice.id)}`, {
          method: 'PUT',
          body: { status: 'paid', paymentMethod: modal.querySelector('#invoicePaymentMethod').value }
        });
        const latestInvoices = await window.OngVangApp.loadInvoices();
        refreshInvoices(latestInvoices);
        modal.innerHTML = '';
        window.OngVangApp?.showToast?.('Đã ghi nhận thanh toán hóa đơn.', 'success');
      } catch (error) {
        button.disabled = false;
        button.textContent = 'Xác nhận thanh toán';
        window.OngVangApp?.showToast?.(error.message || 'Không thể cập nhật thanh toán.', 'error');
      }
    });
  }

  renderInvoiceSummary();
  renderInvoices();
});
