package com.posterita.pos.android.ui.viewmodel

import androidx.lifecycle.*
import com.posterita.pos.android.data.local.dao.ProductCategoryDao
import com.posterita.pos.android.data.local.dao.ProductDao
import com.posterita.pos.android.data.local.entity.Product
import com.posterita.pos.android.data.local.entity.ProductCategory
import com.posterita.pos.android.util.Constants
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.launch
import javax.inject.Inject

@HiltViewModel
class ProductViewModel @Inject constructor(
    private val productDao: ProductDao,
    private val productCategoryDao: ProductCategoryDao
) : ViewModel() {

    val allProducts: LiveData<List<Product>> = productDao.getAllProducts()
    val productCategories: LiveData<List<ProductCategory>> = productCategoryDao.getAllProductCategories()

    private val _categoryId = MutableLiveData<Int>()
    val productsByCategory: LiveData<List<Product>> = _categoryId.switchMap { id ->
        productDao.getProductsByCategoryId(id)
    }

    private val _searchTerm = MutableLiveData<String>()
    val searchResults: LiveData<List<Product>> = _searchTerm.switchMap { term ->
        productDao.searchProducts(term)
    }

    fun getProductsByCategoryId(categoryId: Int) {
        _categoryId.value = categoryId
    }

    fun searchProductsByTerm(term: String) {
        _searchTerm.value = term
    }

    fun searchProductByUpc(upc: String, onFound: (Product) -> Unit, onNotFound: () -> Unit) {
        viewModelScope.launch {
            val product = productDao.getProductByUpc(upc)
            if (product != null) onFound(product) else onNotFound()
        }
    }
}
