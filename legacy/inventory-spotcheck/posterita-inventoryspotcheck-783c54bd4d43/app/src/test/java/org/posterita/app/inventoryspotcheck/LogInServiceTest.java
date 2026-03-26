package org.posterita.app.inventoryspotcheck;

import org.junit.Assert;
import org.junit.Test;
import org.posterita.app.inventoryspotcheck.model.ValidateDomainResult;
import org.posterita.app.inventoryspotcheck.service.LogInService;

public class LogInServiceTest {

    @Test
    public void validateDomain() {

        String server_address = "https://my.posterita.com";
        String domain = "Dummy1";

        ValidateDomainResult result = LogInService.validateDomain(server_address, domain);

        Assert.assertNotNull(result);

        Assert.assertTrue(result.isFound());
    }
}
