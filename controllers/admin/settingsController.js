const SiteSettings = require('../../models/SiteSettings');

exports.index = async (req, res, next) => {
  try {
    const settings = await SiteSettings.getSettings();
    res.render('admin/settings/index', {
      layout: 'layouts/admin',
      title: 'Site Settings',
      settings: settings.toObject(),
    });
  } catch (err) {
    next(err);
  }
};

exports.update = async (req, res, next) => {
  try {
    const {
      siteName, siteDescription, contactEmail, primaryColor,
      facebook, twitter, telegram, discord,
      announcementText, announcementActive,
      minDepositAmount, defaultCommissionRate, maintenanceMode,
      seoTitle, seoDescription, seoKeywords,
      smtpHost, smtpPort, smtpUser, smtpPass, smtpFrom,
    } = req.body;

    const updateData = {
      siteName,
      siteDescription,
      contactEmail,
      primaryColor: primaryColor || '#d8842c',
      socialLinks: {
        facebook: facebook || '',
        twitter: twitter || '',
        telegram: telegram || '',
        discord: discord || '',
      },
      announcementBar: {
        text: announcementText || '',
        isActive: announcementActive === 'on' || announcementActive === 'true',
      },
      minDepositAmount: parseFloat(minDepositAmount) || 1,
      defaultCommissionRate: parseFloat(defaultCommissionRate) || 10,
      maintenanceMode: maintenanceMode === 'on' || maintenanceMode === 'true',
      seoDefaults: {
        title: seoTitle || '',
        description: seoDescription || '',
        keywords: seoKeywords || '',
      },
      smtpSettings: {
        host: smtpHost || '',
        port: parseInt(smtpPort) || 587,
        user: smtpUser || '',
        pass: smtpPass || '',
        from: smtpFrom || '',
      },
    };

    // Handle file uploads
    if (req.files) {
      if (req.files.logo && req.files.logo[0]) {
        updateData.logo = '/uploads/' + req.files.logo[0].filename;
      }
      if (req.files.favicon && req.files.favicon[0]) {
        updateData.favicon = '/uploads/' + req.files.favicon[0].filename;
      }
    }

    await SiteSettings.findOneAndUpdate({ key: 'main' }, updateData, { upsert: true });
    req.flash('success', 'Settings updated successfully');
    res.redirect('/admin/settings');
  } catch (err) {
    next(err);
  }
};
