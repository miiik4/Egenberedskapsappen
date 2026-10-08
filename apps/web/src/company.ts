/** Who runs the app: shown on the contact page, in the privacy policy and in the footer. */
export const COMPANY = {
  name: 'Holm & Tall AS',
  orgNumber: '938 302 790',
  street: 'Storgata 88',
  postcode: '3921 Porsgrunn',
  email: 'kontakt@holmtall.no',
  phone: '+47 404 04 506',
};

export const phoneHref = `tel:${COMPANY.phone.replace(/\s/g, '')}`;
